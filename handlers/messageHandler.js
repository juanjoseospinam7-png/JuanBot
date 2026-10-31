import config from '../config.js';
import { logger } from '../lib/logger.js';
import { error as errorText, warning } from '../lib/format.js';
import { getCommand, getCommands, getPassiveHandlers, reloadCommands } from './commandHandler.js';
import { checkPermissions, getGroupMetadata } from './permissions.js';
import { enforceAntilink } from './moderation.js';
import { db } from './database.js';
import { extractText, getQuotedMessage, parseCommand } from '../lib/message.js';
import {
    isBroadcastJid,
    isOwnerIdentity,
    normalizeJid,
    resolveIdentity
} from '../lib/jid.js';

const seenMessages = new Set();
const seenOrder = [];
const cooldowns = new Map();
const noticeCache = new Map();

const DEDUPE_LIMIT = 1_000;

const rememberMessage = (id) => {
    if (!id) return false;
    if (seenMessages.has(id)) return true;
    seenMessages.add(id);
    seenOrder.push(id);
    if (seenOrder.length > DEDUPE_LIMIT) {
        const oldest = seenOrder.shift();
        seenMessages.delete(oldest);
    }
    return false;
};

const permissionMessage = (reason) => {
    switch (reason) {
        case 'owner_only':
            return '❌ Este comando es exclusivo del *Propietario* de JUAN-BOT.';
        case 'admin_group_only':
            return '❌ Este comando solo funciona dentro de un grupo y requiere ser administrador.';
        case 'admin_only':
            return '❌ Necesitas ser *Administrador del Grupo* para usar este comando.';
        case 'group_only':
            return '❌ Este comando solo se puede usar en grupos.';
        case 'bot_not_admin':
            return '⚠️ Necesito ser *administrador del grupo* para ejecutar esta acción.';
        default:
            return '🚫 No tienes permisos para usar este comando.';
    }
};

const sendText = async (sock, chatId, text, quoted, options = {}) => {
    const payload = { text: String(text) };
    if (options.mentions?.length) payload.mentions = [...new Set(options.mentions.filter(Boolean))];
    const relay = { quoted };
    return sock.sendMessage(chatId, payload, relay);
};

const buildContext = (sock, msg) => {
    const key = msg.key;
    const chatId = normalizeJid(key.remoteJid);
    const identity = resolveIdentity(key, sock.user);
    const isGroup = chatId.endsWith('@g.us');
    const senderId = db.canonicalJid(identity.pn || identity.jid) || identity.jid;
    const botIdentity = resolveIdentity(
        { participant: sock.user?.id, participantAlt: sock.user?.lid },
        sock.user
    );
    const quoted = getQuotedMessage(msg);

    const ctx = {
        sock,
        msg,
        key,
        chatId,
        isGroup,
        identity,
        botIdentity,
        senderId,
        senderJid: identity.jid,
        pushName: msg.pushName || 'Usuario',
        text: extractText(msg).trim(),
        args: [],
        rawArgs: '',
        commandName: null,
        quoted,
        db,
        config,
        logger,
        registry: getCommands(),
        reload: reloadCommands,
        groupMetadata: null,
        isGroupAdmin: false,
        isBotAdmin: false,
        role: 'user',
        isOwner: false,
        async reply(body, options = {}) {
            return sendText(sock, chatId, body, msg, options);
        },
        async send(body, options = {}) {
            return sendText(sock, chatId, body, options.quoted ?? null, options);
        },
        async react(emoji) {
            try {
                return await sock.sendMessage(chatId, { react: { text: emoji, key } });
            } catch (error) {
                logger.debug('[REACCIÓN] No se pudo reaccionar:', error.message);
                return null;
            }
        },
        async getMetadata() {
            return getGroupMetadata(sock, chatId);
        }
    };

    ctx.isOwner = isOwnerIdentity(identity, config);
    ctx.role = ctx.isOwner ? 'owner' : 'user';
    return ctx;
};

const runPassiveHandlers = async (ctx) => {
    for (const handler of getPassiveHandlers()) {
        try {
            const handled = await handler.onMessage(ctx);
            if (handled) return true;
        } catch (error) {
            logger.error(`[PASIVO:${handler.name}]`, error);
        }
    }
    return false;
};

const checkCooldown = async (ctx, command) => {
    if (ctx.isOwner) return true;
    const key = `${ctx.senderId}:${command.name}`;
    const now = Date.now();
    const last = cooldowns.get(key) ?? 0;
    const wait = command.cooldown || config.defaultCooldownMs;
    const remaining = last + wait - now;
    if (remaining <= 0) {
        cooldowns.set(key, now);
        return true;
    }

    const noticeKey = `${ctx.senderId}:notice`;
    const lastNotice = noticeCache.get(noticeKey) ?? 0;
    if (now - lastNotice > 8_000) {
        noticeCache.set(noticeKey, now);
        await ctx.reply(warning(`Espera *${Math.ceil(remaining / 1000)}s* antes de volver a usar *${config.prefix}${command.name}*.`));
    }
    return false;
};

export const handleMessage = async (sock, msg) => {
    try {
        const key = msg?.key;
        if (!key?.remoteJid || key.fromMe) return;
        if (key.remoteJid === 'status@broadcast' || isBroadcastJid(key.remoteJid)) return;
        if (rememberMessage(key.id)) return;

        const timestamp = Number(msg.messageTimestamp) * 1000;
        if (timestamp > 0 && Date.now() - timestamp > config.maxMessageAgeMs) return;

        const ctx = buildContext(sock, msg);
        if (!ctx.text) return;
        if (ctx.identity.lid && ctx.identity.pn) db.linkAlias(ctx.identity.lid, ctx.identity.pn);

        const command = parseCommand(ctx.text, config.prefix);

        if (ctx.isGroup) {
            const group = db.getGroup(ctx.chatId);
            if (group?.antilink) {
                const handled = await enforceAntilink(ctx);
                if (handled) return;
            }
        }

        if (!command) {
            await runPassiveHandlers(ctx);
            return;
        }

        ctx.commandName = command.name;
        ctx.args = command.args;
        ctx.rawArgs = command.rawArgs;

        const registered = getCommand(command.name);
        if (!registered) {
            await ctx.reply(warning(`El comando *${config.prefix}${command.name}* no existe.\nUsa *${config.prefix}menu* para ver la lista completa.`));
            return;
        }

        if (!await checkCooldown(ctx, registered)) return;

        const permission = await checkPermissions(ctx, registered);
        if (!permission.allowed) {
            await ctx.reply(permissionMessage(permission.reason));
            return;
        }

        ctx.registry = getCommands();
        await registered.execute(ctx);
    } catch (error) {
        logger.error('[MENSAJE] Error no controlado:', error);
        try {
            const chatId = normalizeJid(msg?.key?.remoteJid);
            if (chatId) {
                await sendText(sock, chatId, errorText('Ocurrió un error interno. El equipo de JUAN-BOT ya fue notificado.'), msg);
            }
        } catch {
            // Si ni siquiera se puede responder, solo queda el log.
        }
    }
};

export const attachMessageHandlers = (sock) => {
    sock.ev.on('messages.upsert', async (event) => {
        if (event.type !== 'notify') return;
        for (const msg of event.messages ?? []) {
            await handleMessage(sock, msg).catch((error) => logger.error('[MENSAJE] Fallo en lote:', error));
        }
    });
};

const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cooldowns) {
        if (now - value > 3_600_000) cooldowns.delete(key);
    }
    for (const [key, value] of noticeCache) {
        if (now - value > 3_600_000) noticeCache.delete(key);
    }
}, 600_000);
cleanup.unref?.();

export { permissionMessage };
