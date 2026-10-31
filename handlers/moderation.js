import config from '../config.js';
import { logger } from '../lib/logger.js';
import { warning } from '../lib/format.js';
import { hasLink } from '../lib/message.js';
import {
    findParticipant,
    isAdminParticipant,
    isOwnerIdentity,
    onlyDigits
} from '../lib/jid.js';
import { getGroupMetadata } from './permissions.js';

const warnKeyFor = (participant, identity) => (
    onlyDigits(participant?.phoneNumber) ||
    identity?.phone ||
    participant?.id ||
    identity?.jid
);

export const enforceAntilink = async (ctx) => {
    if (!ctx.isGroup) return false;
    const group = ctx.db.getGroup(ctx.chatId);
    if (!group?.antilink || !hasLink(ctx.text)) return false;

    const metadata = ctx.groupMetadata ?? await getGroupMetadata(ctx.sock, ctx.chatId);
    if (!metadata) return true;

    const participant = findParticipant(metadata, ctx.identity);
    const senderIsAdmin = isAdminParticipant(participant);
    if (senderIsAdmin || isOwnerIdentity(ctx.identity, config)) return false;

    const botIdentity = ctx.botIdentity;
    const botParticipant = findParticipant(metadata, botIdentity);
    const botIsAdmin = isAdminParticipant(botParticipant);

    if (botIsAdmin) {
        try {
            await ctx.sock.sendMessage(ctx.chatId, { delete: ctx.msg.key });
        } catch (error) {
            logger.warn('[MODERACIÓN] No se pudo borrar el enlace:', error.message);
        }
    }

    const warnKey = warnKeyFor(participant, ctx.identity);
    const current = group.warns[warnKey] ?? { count: 0, reasons: [], updatedAt: 0 };
    current.count += 1;
    current.reasons = [...(current.reasons ?? []), 'Enlace no permitido'].slice(-5);
    current.updatedAt = Date.now();
    group.warns[warnKey] = current;
    ctx.db.touchGroup(ctx.chatId);

    const mention = participant?.id ? [participant.id] : [];
    await ctx.send(warning([
        `Los enlaces están prohibidos en este grupo.`,
        `Advertencia: *${current.count}/${config.warningsBeforeKick}*`,
        botIsAdmin ? 'El mensaje fue eliminado.' : 'No soy administrador, no pude eliminarlo.'
    ].join('\n')), { mentions: mention });

    if (current.count >= config.warningsBeforeKick && botIsAdmin && participant?.id) {
        try {
            await ctx.sock.groupParticipantsUpdate(ctx.chatId, [participant.id], 'remove');
            delete group.warns[warnKey];
            ctx.db.touchGroup(ctx.chatId);
        } catch (error) {
            logger.warn('[MODERACIÓN] No se pudo expulsar por antilink:', error.message);
        }
    }

    return true;
};
