import config from '../../config.js';
import { warning } from '../../lib/format.js';
import { resolveGroupTarget } from '../../lib/targets.js';
import {
    findParticipant,
    isAdminParticipant,
    isOwnerIdentity,
    onlyDigits,
    resolveIdentity
} from '../../lib/jid.js';

export const requireTarget = async (ctx, usage) => {
    const target = resolveGroupTarget(ctx);
    if (!target) {
        await ctx.reply(warning(`Menciona a un usuario, responde a su mensaje o escribe su número.\n\n*Uso:* ${usage}`));
        return null;
    }
    return target;
};

export const targetIdentity = (target) => {
    const participant = target.participant;
    const phoneJid = onlyDigits(participant?.phoneNumber || target.phone);
    const identity = resolveIdentity({
        participant: participant?.id || target.jid,
        participantAlt: participant?.lid || null,
        remoteJid: phoneJid ? `${phoneJid}@s.whatsapp.net` : null
    });
    if (target.phone) identity.phone = target.phone;
    identity.candidates = [...new Set([
        ...identity.candidates,
        ...(target.identity?.candidates ?? [])
    ])];
    return identity;
};

export const targetIsOwner = (target) => isOwnerIdentity(targetIdentity(target), config);

export const targetIsBot = (ctx, target) => Boolean(
    target.participant && findParticipant({ participants: [target.participant] }, ctx.botIdentity)
);

export const targetIsAdmin = (target) => isAdminParticipant(target.participant);

export const mentionFor = (target) => (
    target.participant?.phoneNumber
        ? `${onlyDigits(target.participant.phoneNumber)}@s.whatsapp.net`
        : (target.participant?.id || target.jid)
);

export const protectTarget = async (ctx, target) => {
    if (targetIsOwner(target)) {
        await ctx.reply(warning('No puedo ejecutar esa acción contra el *propietario* del bot.'));
        return false;
    }
    if (targetIsBot(ctx, target)) {
        await ctx.reply(warning('No puedo ejecutar esa acción contra mí mismo.'));
        return false;
    }
    if (targetIsAdmin(target) && !ctx.isOwner) {
        await ctx.reply(warning('Solo el *propietario* puede actuar contra otro administrador.'));
        return false;
    }
    return true;
};
