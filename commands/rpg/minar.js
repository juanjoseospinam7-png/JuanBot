import config from '../../config.js';
import { formatDuration, formatNumber, success, warning } from '../../lib/format.js';
import { addCoins, addXp } from '../../lib/economy.js';
import { checkRpgCooldown } from './_helpers.js';

const FINDS = [
    ['🪙', 'una veta de oro'],
    ['💎', 'un diamante pequeño'],
    ['🪨', 'una piedra con mineral'],
    ['⛏️', 'un cofre viejo'],
    ['🔱', 'una reliquia rara']
];

export default {
    name: 'minar',
    aliases: ['mine', 'mina'],
    description: 'Mina minerales para ganar monedas',
    usage: `${config.prefix}minar`,
    category: 'rpg',
    emoji: '⛏️',
    cooldown: 3_000,
    async execute(ctx) {
        const user = ctx.db.getUser(ctx.senderId);
        if (!await checkRpgCooldown(ctx, user, 'lastMine', 7_200_000, 'minar')) return;

        user.lastMine = Date.now();
        const failed = Math.random() < 0.18;
        if (failed) {
            addXp(user, 8);
            ctx.db.touchUser(ctx.senderId);
            await ctx.reply(warning([
                '💥 La mina se derrumbó y no encontraste nada.',
                '✨ *Experiencia:* +8 XP',
                '',
                `⏳ Inténtalo de nuevo en *${formatDuration(7_200_000)}*.`
            ].join('\n')));
            return;
        }

        const [emoji, find] = FINDS[Math.floor(Math.random() * FINDS.length)];
        const coins = 150 + Math.floor(Math.random() * 271);
        const xp = 20 + Math.floor(Math.random() * 31);
        addCoins(user, coins);
        const result = addXp(user, xp);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply(success([
            `${emoji} Encontraste ${find}.`,
            '',
            `🪙 *Ganaste:* ${formatNumber(coins)} monedas`,
            `✨ *Experiencia:* +${xp} XP`,
            result.leveledUp ? `🎉 ¡Subiste al nivel *${result.level}*!` : `⭐ *Nivel:* ${result.level}`,
            '',
            `⏳ Vuelve en *${formatDuration(7_200_000)}*.`
        ].join('\n')));
    }
};
