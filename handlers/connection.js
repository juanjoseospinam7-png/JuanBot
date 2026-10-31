import makeWASocket, {
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion,
    isJidBroadcast,
    isJidNewsletter,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState
} from '@whiskeysockets/baileys';
import NodeCache from '@cacheable/node-cache';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import config from '../config.js';
import { baileysLogger, closeLogger, logger } from '../lib/logger.js';
import { attachMessageHandlers } from './messageHandler.js';
import { handleFreefireReaction } from './reactions.js';
import { invalidateGroupCache } from './permissions.js';
import { db } from './database.js';

let sock = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let shuttingDown = false;
let pairingRequested = false;
let lastQr = null;

const backoffDelay = (attempt) => Math.min(60_000, 5_000 * (2 ** Math.max(0, attempt - 1)));

export const getSock = () => sock;

const scheduleReconnect = (reason) => {
    if (shuttingDown || reconnectTimer) return;
    reconnectAttempts += 1;
    const delay = backoffDelay(reconnectAttempts);
    logger.warn(`[CONEXIÓN] Reintentando en ${Math.round(delay / 1000)}s (intento ${reconnectAttempts}). ${reason || ''}`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startBot().catch((error) => logger.error('[CONEXIÓN] Fallo al reconectar:', error));
    }, delay);
};

const handleConnectionUpdate = (socket, update, authState) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
        if (config.usePairingCode && !authState.creds.registered && config.ownerNumber) {
            if (!pairingRequested) {
                pairingRequested = true;
                socket.requestPairingCode(config.ownerNumber)
                    .then((code) => {
                        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
                        logger.info(`[CONEXIÓN] Código de vinculación: ${formatted}`);
                        logger.info('[CONEXIÓN] WhatsApp > Dispositivos vinculados > Vincular con número de teléfono.');
                    })
                    .catch((error) => {
                        pairingRequested = false;
                        logger.error('[CONEXIÓN] No se pudo solicitar el código de vinculación:', error.message);
                    });
            }
        } else if (qr !== lastQr) {
            lastQr = qr;
            logger.info('[CONEXIÓN] Escanea este QR desde WhatsApp > Dispositivos vinculados:');
            qrcode.generate(qr, { small: true });
        }
        return;
    }

    if (connection === 'open') {
        reconnectAttempts = 0;
        pairingRequested = false;
        lastQr = null;
        logger.info(`[CONEXIÓN] JUAN-BOT conectado como ${socket.user?.id || 'desconocido'}.`);
        logger.info('[CONEXIÓN] Listo para recibir comandos.');
        return;
    }

    if (connection === 'close') {
        const disconnectError = lastDisconnect?.error;
        const statusCode = disconnectError?.output?.statusCode
            ?? (disconnectError ? new Boom(disconnectError).output.statusCode : undefined);
        const reason = disconnectError?.message || 'Conexión cerrada';
        if (sock === socket) sock = null;

        if (statusCode === DisconnectReason.loggedOut) {
            logger.error('[CONEXIÓN] Sesión cerrada desde WhatsApp (loggedOut). Escanea un QR nuevo.');
            logger.error(`[CONEXIÓN] Si el problema persiste, elimina la carpeta ${config.authDir} y vuelve a iniciar.`);
            shuttingDown = true;
            setTimeout(() => process.exit(2), 500);
            return;
        }

        if (statusCode === DisconnectReason.restartRequired) {
            logger.warn('[CONEXIÓN] WhatsApp solicitó reiniciar la conexión.');
            scheduleReconnect(reason);
            return;
        }

        scheduleReconnect(reason);
    }
};

const bindSocket = (socket, authState) => {
    socket.ev.on('creds.update', authState.saveCreds);
    socket.ev.on('connection.update', (update) => handleConnectionUpdate(socket, update, authState));
    socket.ev.on('messages.reaction', (event) => {
        handleFreefireReaction(socket, event).catch((error) => logger.error('[REACCIONES]', error));
    });
    socket.ev.on('group-participants.update', (event) => {
        invalidateGroupCache(event.id);
    });
    socket.ev.on('groups.update', (updates) => {
        for (const update of updates ?? []) invalidateGroupCache(update.id);
    });
    socket.ev.on('error', (error) => logger.error('[SOCKET] Error:', error));
    socket.ev.on('call', (calls) => {
        for (const call of calls ?? []) logger.debug(`[LLAMADA] ${call.from} ${call.status}`);
    });

    attachMessageHandlers(socket);
};

export const startBot = async () => {
    if (shuttingDown) return;
    if (sock) return sock;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    try {
        const authState = await useMultiFileAuthState(config.authDir);
        let version;
        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
            logger.debug(`[CONEXIÓN] WhatsApp Web versión ${version.join('.')} (${latest.isLatest ? 'actual' : 'en caché'}).`);
        } catch (error) {
            logger.warn('[CONEXIÓN] No se pudo consultar la última versión de WhatsApp Web:', error.message);
        }

        const socket = makeWASocket({
            ...(version ? { version } : {}),
            auth: {
                creds: authState.state.creds,
                keys: makeCacheableSignalKeyStore(authState.state.keys, baileysLogger)
            },
            logger: baileysLogger,
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnConnect: false,
            syncFullHistory: false,
            emitOwnEvents: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 60_000,
            keepAliveIntervalMs: 30_000,
            qrTimeout: 60_000,
            msgRetryCounterCache: new NodeCache({ stdTTL: 3_600 }),
            shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidNewsletter(jid),
            getMessage: async () => undefined
        });

        sock = socket;
        bindSocket(socket, authState);
        logger.info('[CONEXIÓN] Socket de Baileys iniciado.');
        return socket;
    } catch (error) {
        logger.error('[CONEXIÓN] No se pudo iniciar el socket:', error);
        sock = null;
        scheduleReconnect(error.message);
        return null;
    }
};

export const shutdown = async (signal = 'SIGTERM') => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[SISTEMA] Cerrando JUAN-BOT (${signal})...`);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
        sock?.end(new Error('Apagado solicitado'));
    } catch (error) {
        logger.warn('[SISTEMA] Error cerrando socket:', error.message);
    }
    try {
        await db.flush();
    } catch (error) {
        logger.error('[SISTEMA] No se pudo guardar la base de datos:', error);
    }
    await closeLogger();
    process.exit(0);
};
