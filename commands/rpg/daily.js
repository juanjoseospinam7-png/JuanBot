import config from '../../config.js';
import { formatDuration, formatNumber, success } from '../../lib/format.js';
import { addCoins, addXp } from '../../lib/economy.js';
import { checkRpgCooldown } from './_helpers.js';

export default {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Reclama tu recompensa diaria',
    usage: `${config.prefix}daily`,
    category: 'rpg',
    emoji: '🎁',
    cooldown: 3_000,
    async execute(ctx) {
        const user = ctx.db.getUser(ctx.senderId);
        if (!await checkRpgCooldown(ctx, user, 'lastDaily', 86_400_000, 'daily')) return;

        const reward = 500 + (Number(user.level) || 1) * 50;
        const xp = 50 + (Number(user.level) || 1) * 5;
        user.lastDaily = Date.now();
        addCoins(user, reward);
        const result = addXp(user, xp);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply(success([
            '🎁 ¡Recompensa diaria reclamada!',
            '',
            `🪙 *Monedas:* +${formatNumber(reward)}`,
            `✨ *Experiencia:* +${xp} XP`,
            result.leveledUp ? `🎉 ¡Subiste al nivel *${result.level}*!` : `⭐ *Nivel:* ${result.level}`,
            `💰 *Saldo:* ${formatNumber(user.coins)} monedas`,
            '',
            `⏳ Vuelve en *${formatDuration(86_400_000)}*.`
        ].join('\n')));
    }
};
