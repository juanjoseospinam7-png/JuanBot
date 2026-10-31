import config from '../../config.js';
import { formatNumber, warning } from '../../lib/format.js';
import { formatProfile } from '../../lib/economy.js';
import { resolveProfileTarget } from './_helpers.js';

export default {
    name: 'balance',
    aliases: ['bal', 'coins', 'monedas'],
    description: 'Consulta tus monedas o las de otro usuario',
    usage: `${config.prefix}balance [@usuario]`,
    category: 'rpg',
    emoji: '💰',
    cooldown: 2_000,
    async execute(ctx) {
        const target = resolveProfileTarget(ctx);
        if (!target) {
            await ctx.reply(warning('No pude identificar a ese usuario.'));
            return;
        }

        const user = ctx.db.getUser(target.jid);
        const profile = formatProfile(user, 'BALANCE');
        const extra = target.jid === ctx.senderId
            ? ''
            : `👤 *Usuario:* ${target.label}\n🪙 *Monedas:* ${formatNumber(user.coins)}`;

        await ctx.reply([profile, extra].filter(Boolean).join('\n\n'), { mentions: target.mention });
    }
};
