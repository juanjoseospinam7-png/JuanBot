import path from 'node:path';
import config from '../config.js';
import { logger, closeLogger } from '../lib/logger.js';
import { db } from '../handlers/database.js';

const run = async () => {
    await db.init();
    const destination = await db.backupNow('cron');
    await db.flush();
    logger.info(`[BACKUP] Respaldo creado en ${path.relative(config.rootDir, destination)}`);
    await closeLogger();
};

run().catch(async (error) => {
    logger.error('[BACKUP] Falló el respaldo:', error);
    await closeLogger();
    process.exitCode = 1;
});
