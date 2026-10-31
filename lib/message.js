import { getContentType, normalizeMessageContent } from '@whiskeysockets/baileys';

export const getContent = (message) => normalizeMessageContent(message?.message) ?? {};

export const extractText = (message) => {
    const content = getContent(message);
    const type = getContentType(content);
    const payload = type ? content[type] : null;
    if (!payload) return '';

    switch (type) {
        case 'conversation':
            return content.conversation || '';
        case 'extendedTextMessage':
            return payload.text || '';
        case 'imageMessage':
        case 'videoMessage':
        case 'documentMessage':
        case 'audioMessage':
            return payload.caption || '';
        case 'buttonsResponseMessage':
            return payload.selectedDisplayText || payload.selectedButtonId || '';
        case 'listResponseMessage':
            return payload.singleSelectReply?.selectedRowId || payload.title || '';
        case 'templateButtonReplyMessage':
            return payload.selectedDisplayText || payload.selectedId || '';
        case 'interactiveResponseMessage': {
            const json = payload.nativeFlowResponseMessage?.paramsJson;
            if (!json) return '';
            try {
                const parsed = JSON.parse(json);
                return parsed.id || parsed.selectedId || parsed.title || parsed.text || '';
            } catch {
                return '';
            }
        }
        default:
            return '';
    }
};

export const getContextInfo = (message) => {
    const content = getContent(message);
    const type = getContentType(content);
    return (type && content[type]?.contextInfo) || {};
};

export const getQuotedMessage = (message) => {
    const context = getContextInfo(message);
    const quoted = context.quotedMessage;
    if (!quoted) return null;
    return {
        key: {
            remoteJid: message.key.remoteJid,
            id: context.stanzaId,
            participant: context.participant,
            fromMe: false
        },
        message: quoted,
        messageTimestamp: message.messageTimestamp
    };
};

export const getMentionedJids = (message) => {
    const mentioned = getContextInfo(message).mentionedJid;
    return Array.isArray(mentioned) ? mentioned.filter(Boolean) : [];
};

export const getQuotedParticipant = (message) => {
    const context = getContextInfo(message);
    return context.participant || null;
};

export const tokenize = (input) => {
    const tokens = [];
    const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = pattern.exec(String(input ?? ''))) !== null) {
        tokens.push(match[1] ?? match[2] ?? match[3]);
    }
    return tokens;
};

export const parseCommand = (body, prefix) => {
    const text = String(body ?? '').trim();
    if (!text || !prefix || !text.startsWith(prefix)) return null;
    const withoutPrefix = text.slice(prefix.length).trim();
    if (!withoutPrefix) return null;
    const separator = withoutPrefix.search(/\s/);
    const name = (separator === -1 ? withoutPrefix : withoutPrefix.slice(0, separator)).toLowerCase();
    const rawArgs = separator === -1 ? '' : withoutPrefix.slice(separator).trim();
    if (!name) return null;
    return { name, rawArgs, args: tokenize(rawArgs) };
};

export const isMediaType = (type) => [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage'
].includes(type);

export const getMediaInfo = (message) => {
    const content = getContent(message);
    const type = getContentType(content);
    return { content, type, payload: type ? content[type] : null, isMedia: isMediaType(type) };
};

const LINK_PATTERN = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/)/i;
export const hasLink = (text) => LINK_PATTERN.test(String(text ?? ''));
