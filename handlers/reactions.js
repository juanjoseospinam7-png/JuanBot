import { logger } from '../lib/logger.js';
import { onlyDigits, participantMatches, resolveIdentity } from '../lib/jid.js';
import { db } from './database.js';

const ALLOWED = new Set(['❤', '👍', '🔥', '✅', '💜']);
const MAX_PLAYERS = 10;

const normalizeEmoji = (value) => String(value ?? '').replace(/\uFE0F/g, '').trim();

export const renderListText = (list) => {
    const players = (list.participants ?? []).slice(0, MAX_PLAYERS);
    const slots = Array.from({ length: MAX_PLAYERS }, (_, index) => {
        const player = players[index];
        if (!player) return `┃ ${index + 1}. ⬜ _Libre_`;
        return `┃ ${index + 1}. ${player.emoji || '🎮'} @${player.phone || onlyDigits(player.jid)}`;
    });

    return [
        '╭━「 🎮 *FREE FIRE · LISTA* 」━╮',
        `┃ 🆔 *Sala:* ${list.code || 'PENDIENTE'}`,
        `┃ 👥 *Cupos:* ${players.length}/${MAX_PLAYERS}`,
        `┃ 🕒 *Actualizado:* ${new Date(list.updatedAt || Date.now()).toLocaleTimeString('es-CO', { timeZone: process.env.TZ || 'America/Bogota' })}`,
        '┠──────────────────────────',
        ...slots,
        '╰──────────────────────────╯',
        '',
        '❤️ o 👍 Reacciona a *este mensaje* para entrar o salir.',
        '📞 Organiza: el administrador del grupo.'
    ].join('\n');
};

const listMentions = (list) => (list.participants ?? [])
    .slice(0, MAX_PLAYERS)
    .map((player) => player.jid)
    .filter(Boolean);

const findPlayer = (list, identity) => (list.participants ?? [])
    .findIndex((player) => participantMatches({
        id: player.jid,
        phoneNumber: player.phone,
        lid: player.lid
    }, identity));

const saveAndEdit = async (sock, list) => {
    list.updatedAt = Date.now();
    db.putFreefireList(list);
    const text = renderListText(list);
    const mentions = listMentions(list);
    try {
        await sock.sendMessage(list.chatId, { text, edit: list.key, mentions });
    } catch (error) {
        logger.warn('[FREEFIRE] No se pudo editar la lista, enviando una nueva:', error.message);
        try {
            const sent = await sock.sendMessage(list.chatId, { text, mentions });
            if (sent?.key) {
                db.deleteFreefireList(list.messageId);
                list.messageId = sent.key.id;
                list.key = sent.key;
                db.putFreefireList(list);
            }
        } catch (sendError) {
            logger.error('[FREEFIRE] No se pudo publicar la lista actualizada:', sendError.message);
        }
    }
};

export const refreshFreefireList = async (sock, list) => saveAndEdit(sock, list);

export const handleFreefireReaction = async (sock, event) => {
    const events = Array.isArray(event) ? event : [event];
    for (const item of events) {
        try {
            const list = db.getFreefireList(item?.key?.id);
            if (!list || list.active === false) continue;

            const reactionKey = item.reaction?.key ?? {};
            if (reactionKey.fromMe) continue;

            const identity = resolveIdentity(reactionKey, sock.user);
            if (!identity.jid) continue;
            if (identity.lid && identity.pn) db.linkAlias(identity.lid, identity.pn);

            const emoji = normalizeEmoji(item.reaction?.text);
            const index = findPlayer(list, identity);
            if (!emoji) {
                if (index === -1) continue;
                list.participants.splice(index, 1);
                await saveAndEdit(sock, list);
                continue;
            }
            if (!ALLOWED.has(emoji)) continue;

            if (index !== -1) {
                if (list.participants[index].emoji === emoji) continue;
                list.participants[index].emoji = emoji;
                await saveAndEdit(sock, list);
                continue;
            }

            if (list.participants.length >= MAX_PLAYERS) continue;

            list.participants.push({
                jid: identity.jid,
                lid: identity.lid || null,
                phone: identity.phone || onlyDigits(identity.jid),
                emoji,
                at: Date.now()
            });
            await saveAndEdit(sock, list);
        } catch (error) {
            logger.error('[FREEFIRE] Error procesando reacción:', error);
        }
    }
};

export { MAX_PLAYERS, normalizeEmoji };
