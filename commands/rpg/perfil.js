import config from '../../config.js';
import { box, formatDate, formatNumber, warning } from '../../lib/format.js';
import { formatProfile, rankOf } from '../../lib/economy.js';
import { resolveProfileTarget } from './_helpers.js';

export default {
    name: 'perfil',
    aliases: ['profile', 'me'],
    description: 'Muestra tu perfil RPG o el de otro usuario',
    usage: `${config.prefix}perfil [@usuario]`,
    category: 'rpg',
    emoji: '👤',
    cooldown: 3_000,
    async execute(ctx) {
        const target = resolveProfileTarget(ctx);
        if (!target) {
            await ctx.reply(warning('No pude identificar a ese usuario.'));
            return;
        }

        const user = ctx.db.getUser(target.jid);
        const rank = rankOf(ctx.db.users, target.jid);
        const profile = formatProfile(user, 'PERFIL RPG');
        const meta = box('DATOS', [
            `│ 🏅 *Ranking:* ${rank ? `#${rank}` : 'Sin clasificar'}`,
            `│ 🪙 *Monedas:* ${formatNumber(user.coins)}`,
            `│ 📅 *Registro:* ${formatDate(user.createdAt)}`,
            `│ 🕒 *Última actividad:* ${formatDate(user.updatedAt)}`
        ], '📇');

        await ctx.reply([
            profile,
            '',
            meta,
            target.jid === ctx.senderId ? '' : `👤 *Consultado:* ${target.label}`
        ].filter(Boolean).join('\n'), { mentions: target.mention });
    }
};
