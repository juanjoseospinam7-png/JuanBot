import path from 'node:path';
import config from '../../config.js';
import { error, success } from '../../lib/format.js';

export default {
    name: 'backup',
    aliases: ['respaldo'],
    description: 'Crea una copia de seguridad de la base de datos',
    usage: `${config.prefix}backup`,
    category: 'owner',
    emoji: '💾',
    permission: 'owner',
    cooldown: 30_000,
    async execute(ctx) {
        try {
            const destination = await ctx.db.backupNow('manual');
            await ctx.reply(success([
                '💾 Copia de seguridad creada.',
                `📁 ${path.relative(config.rootDir, destination)}`
            ].join('\n')));
        } catch (err) {
            ctx.logger.error('[BACKUP]', err);
            await ctx.reply(error(`No se pudo crear el respaldo: ${err.message}`));
        }
    }
};
