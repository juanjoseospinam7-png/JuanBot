import config from '../config.js';
import { logger } from '../lib/logger.js';
import {
    findParticipant,
    isAdminParticipant,
    isOwnerIdentity,
    normalizeJid,
    resolveIdentity
} from '../lib/jid.js';

const CACHE_TTL_MS = 30_000;
const metadataCache = new Map();

export const invalidateGroupCache = (chatId) => {
    if (chatId) metadataCache.delete(normalizeJid(chatId));
    else metadataCache.clear();
};

export const clearGroupCache = () => metadataCache.clear();

export const getGroupMetadata = async (sock, chatId) => {
    const key = normalizeJid(chatId);
    const cached = metadataCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    let timer;
    try {
        const metadata = await Promise.race([
            sock.groupMetadata(key),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Tiempo de espera agotado obteniendo metadata del grupo')), 8_000);
                timer.unref?.();
            })
        ]);
        metadataCache.set(key, { data: metadata, expiresAt: Date.now() + CACHE_TTL_MS });
        return metadata;
    } catch (error) {
        logger.warn(`[PERMISOS] No se pudo obtener metadata de ${key}:`, error.message);
        metadataCache.delete(key);
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
};

export const evaluatePermissions = ({ command, isGroup, isOwner, isGroupAdmin, isBotAdmin }) => {
    const permission = command?.permission || 'user';
    if (command?.groupOnly && !isGroup) {
        return { allowed: false, reason: 'group_only' };
    }
    if (permission === 'owner' && !isOwner) {
        return { allowed: false, reason: 'owner_only' };
    }
    if (permission === 'admin') {
        if (!isGroup) return { allowed: false, reason: 'admin_group_only' };
        if (!isOwner && !isGroupAdmin) return { allowed: false, reason: 'admin_only' };
    }
    if (command?.botAdminRequired && isGroup && !isBotAdmin) {
        return { allowed: false, reason: 'bot_not_admin' };
    }
    return { allowed: true, reason: null };
};

export const checkPermissions = async (ctx, command) => {
    const isGroup = Boolean(ctx.isGroup);
    const isOwner = isOwnerIdentity(ctx.identity, config);
    let metadata = null;
    let isGroupAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
        metadata = ctx.groupMetadata ?? await getGroupMetadata(ctx.sock, ctx.chatId);
        if (metadata) {
            const senderParticipant = findParticipant(metadata, ctx.identity);
            isGroupAdmin = isAdminParticipant(senderParticipant);

            const botIdentity = resolveIdentity(
                { participant: ctx.sock.user?.id, participantAlt: ctx.sock.user?.lid },
                ctx.sock.user
            );
            isBotAdmin = isAdminParticipant(findParticipant(metadata, botIdentity));
        }
    }

    const result = evaluatePermissions({
        command,
        isGroup,
        isOwner,
        isGroupAdmin,
        isBotAdmin
    });

    ctx.groupMetadata = metadata;
    ctx.isGroupAdmin = isGroupAdmin;
    ctx.isBotAdmin = isBotAdmin;
    ctx.role = isOwner ? 'owner' : (isGroupAdmin ? 'admin' : 'user');

    return result;
};

export const __test__ = { evaluatePermissions };
