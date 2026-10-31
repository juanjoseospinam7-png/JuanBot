import config from './config.js';
import { logger } from './lib/logger.js';
import { db } from './handlers/database.js';
import { getCommandCount, loadCommands } from './handlers/commandHandler.js';
import { startBot, shutdown } from './handlers/connection.js';

let shuttingDown = false;
let dbReady = false;

const fatal = async (label, error) => {
    logger.error(label, error);
    if (dbReady) {
        try {
            db.flushSync();
        } catch {
            // El logger ya reportó el fallo original.
        }
    }
    setTimeout(() => process.exit(1), 200);
};

process.on('unhandledRejection', (reason) => {
    logger.error('[SISTEMA] Promesa rechazada sin manejar:', reason);
});

process.on('uncaughtException', (error) => {
    void fatal('[SISTEMA] Excepción no capturada:', error);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        if (shuttingDown) return;
        shuttingDown = true;
        shutdown(signal).catch((error) => {
            logger.error('[SISTEMA] Fallo durante el apagado:', error);
            process.exit(1);
        });
    });
}

const main = async () => {
    logger.info('╭──────────────────────────────────────╮');
    logger.info(`│  ${config.botName} · Baileys · 24/7`);
    logger.info('╰──────────────────────────────────────╯');
    logger.info(`[SISTEMA] Prefijo: ${config.prefix} · Zona: ${config.timezone}`);

    await db.init();
    dbReady = true;
    await loadCommands();
    const commandCount = getCommandCount();
    if (!commandCount) throw new Error('No se cargó ningún comando. Revisa la carpeta commands/.');
    logger.info(`[SISTEMA] ${commandCount} comandos disponibles.`);

    await startBot();

    if (!config.ownerNumber) {
        logger.warn('[SISTEMA] OWNER_NUMBER no está configurado; los comandos de propietario están bloqueados.');
    }
    logger.info('[SISTEMA] Esperando conexión con WhatsApp...');
};

main().catch((error) => fatal('[SISTEMA] No se pudo iniciar JUAN-BOT:', error));
