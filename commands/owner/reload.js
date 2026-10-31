import config from '../../config.js';
import { error, success } from '../../lib/format.js';
import { getCommandCount } from '../../handlers/commandHandler.js';

export default {
    name: 'reload',
    aliases: ['recargar'],
    description: 'Recarga todos los comandos sin reiniciar',
    usage: `${config.prefix}reload`,
    category: 'owner',
    emoji: '🔄',
    permission: 'owner',
    cooldown: 10_000,
    async execute(ctx) {
        try {
            const before = getCommandCount();
            await ctx.reload();
            const after = getCommandCount();
            await ctx.reply(success([
                '🔄 Comandos recargados correctamente.',
                `📦 Antes: *${before}* · Ahora: *${after}*`
            ].join('\n')));
        } catch (err) {
            ctx.logger.error('[RELOAD]', err);
            await ctx.reply(error(`No se pudieron recargar los comandos: ${err.message}`));
        }
    }
};
