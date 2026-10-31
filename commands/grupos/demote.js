import config from '../../config.js';
import { error, info, success, warning } from '../../lib/format.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';
import { mentionFor, protectTarget, requireTarget, targetIsAdmin } from './_helpers.js';

export default {
    name: 'demote',
    aliases: ['degradar', 'quitaradmin'],
    description: 'Quita el rango de administrador a un miembro',
    usage: `${config.prefix}demote @usuario`,
    category: 'grupos',
    emoji: '⬇️',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 3_000,
    async execute(ctx) {
        const target = await requireTarget(ctx, `${config.prefix}demote @usuario`);
        if (!target?.participant) {
            await ctx.reply(warning('Ese número no está en el grupo o no pude identificarlo.'));
            return;
        }
        if (!await protectTarget(ctx, target)) return;
        if (!targetIsAdmin(target)) {
            await ctx.reply(info('Ese miembro no es administrador del grupo.'));
            return;
        }

        try {
            await ctx.sock.groupParticipantsUpdate(ctx.chatId, [target.participant.id], 'demote');
            invalidateGroupCache(ctx.chatId);
            await ctx.reply(success(`⬇️ @${target.phone} ya no es administrador del grupo.`), {
                mentions: [mentionFor(target)]
            });
        } catch (err) {
            ctx.logger.error('[DEMOTE]', err);
            await ctx.reply(error('No pude quitar el rango al usuario. Revisa mis permisos.'));
        }
    }
};
