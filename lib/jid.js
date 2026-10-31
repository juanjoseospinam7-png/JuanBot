const DIGITS = /\D/g;

export const onlyDigits = (value) => String(value ?? '').replace(DIGITS, '');

export const normalizeJid = (jid) => {
    if (!jid) return '';
    return String(jid)
        .trim()
        .toLowerCase()
        .replace(/@c\.us$/i, '@s.whatsapp.net')
        .replace(/:\d+@/g, '@');
};

export const phoneFromJid = (jid) => onlyDigits(String(jid ?? '').split('@')[0]);

export const isGroupJid = (jid) => normalizeJid(jid).endsWith('@g.us');
export const isLidJid = (jid) => normalizeJid(jid).endsWith('@lid');
export const isPnJid = (jid) => normalizeJid(jid).endsWith('@s.whatsapp.net');
export const isBroadcastJid = (jid) => {
    const normalized = normalizeJid(jid);
    return normalized.endsWith('@broadcast') || normalized.endsWith('@newsletter');
};

export const jidAliases = (jid) => {
    const normalized = normalizeJid(jid);
    if (!normalized) return [];
    const phone = phoneFromJid(normalized);
    const result = new Set([normalized]);
    if (phone) {
        result.add(phone);
        result.add(`${phone}@s.whatsapp.net`);
        result.add(`${phone}@lid`);
    }
    return [...result];
};

export const resolveIdentity = (key = {}, user = null) => {
    const rawValues = [
        key.participant,
        key.remoteJid,
        key.participantAlt,
        key.remoteJidAlt
    ].filter(Boolean).map(normalizeJid);

    if (user) {
        rawValues.push(normalizeJid(user.id), normalizeJid(user.lid), normalizeJid(user.phoneNumber));
    }

    let pn = null;
    let lid = null;
    for (const value of rawValues.filter(Boolean)) {
        if (!pn && isPnJid(value)) pn = value;
        if (!lid && isLidJid(value)) lid = value;
    }

    const primary = normalizeJid(key.participant || key.remoteJid || pn || lid);
    const candidates = new Set([...rawValues, primary]);
    for (const value of [...candidates]) {
        for (const alias of jidAliases(value)) candidates.add(alias);
    }

    return {
        jid: primary,
        pn,
        lid,
        phone: phoneFromJid(pn || primary),
        candidates: [...candidates].filter(Boolean)
    };
};

export const participantMatches = (participant, identity) => {
    if (!participant) return false;
    const values = [participant.id, participant.lid, participant.phoneNumber]
        .filter(Boolean)
        .flatMap((value) => [normalizeJid(value), onlyDigits(value), ...jidAliases(value)]);
    const wanted = new Set(identity?.candidates ?? []);
    if (identity?.phone) wanted.add(identity.phone);
    if (identity?.pn) wanted.add(normalizeJid(identity.pn));
    if (identity?.lid) wanted.add(normalizeJid(identity.lid));

    const wantedPhones = new Set([...wanted].map(onlyDigits).filter(Boolean));
    return values.some((value) => {
        if (wanted.has(value)) return true;
        const phone = onlyDigits(value);
        return phone && wantedPhones.has(phone);
    });
};

export const findParticipant = (metadata, identity) => {
    if (!metadata?.participants) return null;
    return metadata.participants.find((participant) => participantMatches(participant, identity)) ?? null;
};

export const isOwnerIdentity = (identity, config) => {
    if (!identity) return false;
    const ownerNumber = config.ownerNumber;
    const ownerJid = normalizeJid(config.ownerJid);
    const ownerLid = normalizeJid(config.ownerLid);

    if (!ownerNumber && !ownerJid && !ownerLid) return false;
    if (ownerJid && identity.candidates.includes(ownerJid)) return true;
    if (ownerLid && identity.candidates.includes(ownerLid)) return true;
    if (ownerNumber && identity.phone && identity.phone === ownerNumber) return true;
    return false;
};

export const isAdminParticipant = (participant) => Boolean(
    participant && (
        participant.admin === 'admin' ||
        participant.admin === 'superadmin' ||
        participant.isAdmin ||
        participant.isSuperAdmin
    )
);

export const participantJid = (participant) => normalizeJid(participant?.id || participant?.lid || participant?.phoneNumber);

export const mentionToken = (identity, fallback = '') => `@${identity?.phone || onlyDigits(identity?.jid) || fallback}`;
