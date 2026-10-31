import {
    findParticipant,
    isLidJid,
    isPnJid,
    jidAliases,
    normalizeJid,
    onlyDigits,
    participantJid,
    phoneFromJid
} from './jid.js';
import { getMentionedJids, getQuotedParticipant } from './message.js';

export const buildTargetIdentity = (ctx) => {
    const mentioned = getMentionedJids(ctx.msg);
    const quoted = getQuotedParticipant(ctx.msg);
    const rawArg = ctx.args?.[0] ? String(ctx.args[0]).replace(/^@/, '') : '';
    const argument = rawArg
        ? (rawArg.includes('@') ? normalizeJid(rawArg) : `${onlyDigits(rawArg)}@s.whatsapp.net`)
        : null;

    const raw = [mentioned[0], quoted, argument].filter(Boolean).map(normalizeJid);
    if (!raw.length) return null;

    const primary = raw[0];
    const candidates = new Set(raw);
    for (const jid of raw) {
        for (const alias of jidAliases(jid)) candidates.add(alias);
    }
    const phone = onlyDigits(primary) || phoneFromJid(primary);
    return {
        jid: primary,
        pn: isPnJid(primary) ? primary : null,
        lid: isLidJid(primary) ? primary : null,
        phone,
        candidates: [...candidates].filter(Boolean)
    };
};

export const resolveGroupTarget = (ctx) => {
    const identity = buildTargetIdentity(ctx);
    if (!identity) return null;
    const participant = findParticipant(ctx.groupMetadata, identity);
    if (participant) {
        return {
            identity,
            participant,
            jid: participantJid(participant),
            phone: onlyDigits(participant.phoneNumber) || identity.phone
        };
    }
    return {
        identity,
        participant: null,
        jid: identity.pn || identity.jid,
        phone: identity.phone
    };
};

export const targetLabel = (target) => `@${target.phone || onlyDigits(target.jid) || 'usuario'}`;

export const groupParticipantIds = (metadata) => (metadata?.participants ?? [])
    .map((participant) => participant.id)
    .filter(Boolean);

export const isSameParticipant = (participant, identity) => Boolean(findParticipant({ participants: [participant] }, identity));
