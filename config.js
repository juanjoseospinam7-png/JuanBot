import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(String(value).toLowerCase());
};

const digits = (value) => String(value ?? '').replace(/\D/g, '');

const normalizeLid = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return null;
    const numeric = digits(raw);
    return numeric ? `${numeric}@lid` : null;
};

const ownerNumber = digits(process.env.OWNER_NUMBER);
const ownerJid = ownerNumber.length >= 8 ? `${ownerNumber}@s.whatsapp.net` : null;
const ownerLid = normalizeLid(process.env.OWNER_LID);
const prefix = String(process.env.PREFIX ?? '..').trim() || '..';

const config = {
    rootDir,
    prefix,
    botName: String(process.env.BOT_NAME || 'JUAN-BOT').trim(),
    ownerNumber: ownerNumber.length >= 8 ? ownerNumber : null,
    ownerJid,
    ownerLid,
    authDir: path.resolve(rootDir, process.env.AUTH_DIR || 'auth_info_baileys'),
    databaseDir: path.resolve(rootDir, 'database'),
    usePairingCode: toBool(process.env.USE_PAIRING_CODE),
    logLevel: String(process.env.LOG_LEVEL || 'info').toLowerCase(),
    stickerPack: String(process.env.STICKER_PACK || 'JUAN-BOT'),
    stickerAuthor: String(process.env.STICKER_AUTHOR || 'JUANOSPINA'),
    maxDownloadBytes: toInt(process.env.MAX_DOWNLOAD_MB, 64) * 1024 * 1024,
    downloadTimeoutMs: toInt(process.env.DOWNLOAD_TIMEOUT_MS, 180_000),
    ytdlpCookies: process.env.YTDLP_COOKIES ? path.resolve(rootDir, process.env.YTDLP_COOKIES) : null,
    defaultCooldownMs: toInt(process.env.DEFAULT_COOLDOWN_MS, 2_500),
    maxMessageAgeMs: toInt(process.env.SESSION_MAX_AGE_MS, 180_000),
    nsfwEnabled: toBool(process.env.NSFW_ENABLED),
    timezone: process.env.TZ || 'America/Bogota',
    maxStickerBytes: 1024 * 1024,
    isProduction: process.env.NODE_ENV === 'production',
    warningsBeforeKick: 3
};

if (!config.ownerNumber) {
    console.warn('[CONFIG] OWNER_NUMBER no es válido. Los comandos de propietario quedarán bloqueados hasta configurarlo.');
}

export default Object.freeze(config);
