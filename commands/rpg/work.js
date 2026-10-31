import config from '../../config.js';
import { success, formatNumber, formatDuration } from '../../lib/format.js';
import { addCoins, addXp } from '../../lib/economy.js';
import { checkRpgCooldown } from './_helpers.js';

const JOBS = [
    ['🧑‍💻', 'programaste un bot para un cliente'],
    ['🚚', 'repartiste paquetes por la ciudad'],
    ['🍔', 'trabajaste en una hamburguesería'],
    ['🧹', 'limpiaste oficinas'],
    ['🎧', 'editaste audio para un podcast'],
    ['🛠️', 'reparaste una computadora'],
    ['📦', 'organizaste el inventario'],
    ['🚕', 'hiciste viajes como conductor']
];

export default {
    name: 'work',
    aliases: ['trabajar', 'chamba'],
    description: 'Trabaja para ganar monedas y experiencia',
    usage: `${config.prefix}work`,
    category: 'rpg',
    emoji: '💼',
    cooldown: 3_000,
    async execute(ctx) {
        const user = ctx.db.getUser(ctx.senderId);
        if (!await checkRpgCooldown(ctx, user, 'lastWork', 3_600_000, 'work')) return;

        const [emoji, job] = JOBS[Math.floor(Math.random() * JOBS.length)];
        const coins = 80 + Math.floor(Math.random() * 141);
        const xp = 15 + Math.floor(Math.random() * 16);
        user.lastWork = Date.now();
        addCoins(user, coins);
        const result = addXp(user, xp);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply(success([
            `${emoji} Hoy ${job}.`,
            '',
            `🪙 *Ganaste:* ${formatNumber(coins)} monedas`,
            `✨ *Experiencia:* +${xp} XP`,
            result.leveledUp ? `🎉 ¡Subiste al nivel *${result.level}*!` : `⭐ *Nivel:* ${result.level}`,
            '',
            `⏳ Vuelve en *${formatDuration(3_600_000)}*.`
        ].join('\n')));
    }
};
