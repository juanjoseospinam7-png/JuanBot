import config from '../../config.js';
import { error, info, success } from '../../lib/format.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';
import { mentionFor, requireTarget, targetIsAdmin, targetIsBot } from './_helpers.js';

export default {
    name: 'promote',
    aliases: ['ascender', 'admin'],
    description: 'Promueve a un miembro a administrador',
    usage: `${config.prefix}promote @usuario`,
    category: 'grupos',
    emoji: '⬆️',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 3_000,
    async execute(ctx) {
        const target = await requireTarget(ctx, `${config.prefix}promote @usuario`);
        if (!target?.participant) {
            await ctx.reply('⚠️ Ese número no está en el grupo o no pude identificarlo.');
            return;
        }
        if (targetIsBot(ctx, target)) {
            await ctx.reply('⚠️ No necesito el rango de administrador del grupo.');
            return;
        }
        if (targetIsAdmin(target)) {
            await ctx.reply(info('Ese miembro ya es administrador del grupo.'));
            return;
        }

        try {
            await ctx.sock.groupParticipantsUpdate(ctx.chatId, [target.participant.id], 'promote');
            invalidateGroupCache(ctx.chatId);
            await ctx.reply(success(`⬆️ @${target.phone} ahora es administrador del grupo.`), {
                mentions: [mentionFor(target)]
            });
        } catch (err) {
            ctx.logger.error('[PROMOTE]', err);
            await ctx.reply(error('No pude promover al usuario. Revisa mis permisos.'));
        }
    }
};
