import config from '../../config.js';
import { box, formatNumber, quote } from '../../lib/format.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default {
    name: 'top',
    aliases: ['ranking', 'leaderboard'],
    description: 'Muestra el ranking de monedas',
    usage: `${config.prefix}top`,
    category: 'rpg',
    emoji: '🏆',
    cooldown: 5_000,
    async execute(ctx) {
        const users = Object.values(ctx.db.users)
            .filter((user) => Number(user.coins) > 0)
            .sort((a, b) => Number(b.coins) - Number(a.coins))
            .slice(0, 10);

        if (!users.length) {
            await ctx.reply('🏆 Todavía nadie tiene monedas. Usa *' + config.prefix + 'daily* para empezar.');
            return;
        }

        const lines = users.map((user, index) => (
            `│ ${MEDALS[index] || `${index + 1}.`} *${String(user.jid).split('@')[0]}* — ${formatNumber(user.coins)} 🪙 · Nv. ${user.level || 1}`
        ));

        await ctx.reply([
            box('TOP 10 · MILLONARIOS', lines, '🏆'),
            '',
            quote(`${config.botName} · Ranking en tiempo real`)
        ].join('\n'));
    }
};
