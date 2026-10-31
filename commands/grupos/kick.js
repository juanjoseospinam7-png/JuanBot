import config from '../../config.js';
import { error, success, warning } from '../../lib/format.js';
import { findParticipant } from '../../lib/jid.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';
import { mentionFor, protectTarget, requireTarget } from './_helpers.js';

export default {
    name: 'kick',
    aliases: ['expulsar', 'ban'],
    description: 'Expulsa a un miembro del grupo',
    usage: `${config.prefix}kick @usuario [motivo]`,
    category: 'grupos',
    emoji: '👢',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 3_000,
    async execute(ctx) {
        const target = await requireTarget(ctx, `${config.prefix}kick @usuario`);
        if (!target) return;
        if (!target.participant) {
            await ctx.reply(warning('Ese número no está en el grupo o no pude identificarlo.'));
            return;
        }
        if (findParticipant({ participants: [target.participant] }, ctx.identity)) {
            await ctx.reply(warning('No puedes expulsarte a ti mismo.'));
            return;
        }
        if (!await protectTarget(ctx, target)) return;

        const jid = target.participant.id || target.jid;
        const reason = ctx.args.slice(1).join(' ').trim();
        try {
            await ctx.sock.groupParticipantsUpdate(ctx.chatId, [jid], 'remove');
            invalidateGroupCache(ctx.chatId);
            await ctx.reply(success([
                `@${target.phone || jid.split('@')[0]} fue expulsado del grupo.`,
                reason ? `📝 Motivo: ${reason}` : null
            ].filter(Boolean).join('\n')), { mentions: [mentionFor(target)] });
        } catch (err) {
            ctx.logger.error('[KICK]', err);
            await ctx.reply(error('No pude expulsar al usuario. Verifica que sea miembro y que yo sea administrador.'));
        }
    }
};
