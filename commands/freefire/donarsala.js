import config from '../../config.js';
import { error, success, warning } from '../../lib/format.js';
import { refreshFreefireList } from '../../handlers/reactions.js';

export default {
    name: 'donarsala',
    aliases: ['donar'],
    description: 'Actualiza el código de la sala activa',
    usage: `${config.prefix}donarsala <código>`,
    category: 'freefire',
    emoji: '🎁',
    permission: 'user',
    groupOnly: true,
    cooldown: 5_000,
    async execute(ctx) {
        const code = ctx.rawArgs.trim();
        if (!code) {
            await ctx.reply(warning(`Escribe el código de la sala.\n\n*Uso:* ${config.prefix}donarsala ABC123`));
            return;
        }

        const list = ctx.db.getActiveFreefireList(ctx.chatId);
        if (!list) {
            await ctx.reply(warning(`No hay una lista activa en este grupo. Crea una con *${config.prefix}lista*.`));
            return;
        }

        list.code = code.slice(0, 40);
        try {
            await refreshFreefireList(ctx.sock, list);
            await ctx.reply(success(`🎁 Código de sala actualizado a *${list.code}*.`));
        } catch (err) {
            ctx.logger.error('[FREEFIRE] No se pudo actualizar la sala:', err);
            await ctx.reply(error('No pude actualizar la lista de la sala.'));
        }
    }
};
