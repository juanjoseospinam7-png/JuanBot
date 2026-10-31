import crypto from 'node:crypto';
import config from '../../config.js';
import { formatNumber, warning } from '../../lib/format.js';
import { addCoins, addXp, parseAmount } from '../../lib/economy.js';

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const normalize = (value) => String(value ?? '').toLowerCase().trim();

export default {
    name: 'ruleta',
    aliases: ['roulette'],
    description: 'Apuesta monedas al rojo o al negro',
    usage: `${config.prefix}ruleta <rojo|negro> <apuesta>`,
    category: 'juegos',
    emoji: '🎰',
    cooldown: 8_000,
    async execute(ctx) {
        let color = normalize(ctx.args[0]);
        let betInput = ctx.args[1];
        if (!['rojo', 'negro'].includes(color)) {
            color = null;
            betInput = ctx.args[0];
        }

        const bet = parseAmount(betInput);
        if (!bet) {
            await ctx.reply(warning(`Indica una apuesta válida.\n\n*Uso:* ${config.prefix}ruleta rojo 100`));
            return;
        }

        const user = ctx.db.getUser(ctx.senderId);
        if (user.coins < bet) {
            await ctx.reply(warning(`No tienes suficientes monedas.\n💰 *Saldo:* ${formatNumber(user.coins)}`));
            return;
        }

        const chosen = color || (Math.random() < 0.5 ? 'rojo' : 'negro');
        const spin = crypto.randomInt(0, 37);
        const resultColor = spin === 0 ? 'verde' : (RED.has(spin) ? 'rojo' : 'negro');
        const won = chosen === resultColor;

        addCoins(user, won ? bet : -bet);
        addXp(user, won ? 12 : 4);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply([
            '🎰 *RULETA*',
            '',
            `🎯 Salió: *${spin}* ${resultColor === 'rojo' ? '🔴' : resultColor === 'negro' ? '⚫' : '🟢'} (${resultColor})`,
            `🎟️ Apostaste: ${chosen === 'rojo' ? '🔴' : '⚫'} *${chosen}* · ${formatNumber(bet)} monedas`,
            '',
            won ? `🎉 ¡Ganaste *${formatNumber(bet)}* monedas!` : `💸 Perdiste *${formatNumber(bet)}* monedas.`,
            `💰 *Saldo:* ${formatNumber(user.coins)}`
        ].join('\n'));
    }
};
