import config from '../../config.js';
import { formatNumber, warning } from '../../lib/format.js';
import { addCoins, addXp } from '../../lib/economy.js';

const OPTIONS = {
    piedra: { emoji: '🪨', beats: 'tijera' },
    papel: { emoji: '📄', beats: 'piedra' },
    tijera: { emoji: '✂️', beats: 'papel' }
};

const normalize = (value) => String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export default {
    name: 'ppt',
    aliases: ['piedrapapeltijera'],
    description: 'Juega piedra, papel o tijera contra el bot',
    usage: `${config.prefix}ppt <piedra|papel|tijera>`,
    category: 'juegos',
    emoji: '✂️',
    cooldown: 4_000,
    async execute(ctx) {
        const choice = normalize(ctx.args[0]);
        if (!OPTIONS[choice]) {
            await ctx.reply(warning(`Elige una opción: *piedra*, *papel* o *tijera*.\nEjemplo: *${config.prefix}ppt piedra*`));
            return;
        }

        const keys = Object.keys(OPTIONS);
        const botChoice = keys[Math.floor(Math.random() * keys.length)];
        const user = ctx.db.getUser(ctx.senderId);
        let result;
        let coins = 0;
        let xp = 3;

        if (choice === botChoice) {
            result = '🤝 ¡Empate!';
            coins = 10;
            xp = 5;
        } else if (OPTIONS[choice].beats === botChoice) {
            result = '🎉 ¡Ganaste!';
            coins = 60;
            xp = 10;
        } else {
            result = '😵 Perdiste...';
        }

        if (coins) addCoins(user, coins);
        addXp(user, xp);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply([
            '✂️ *PIEDRA, PAPEL O TIJERA*',
            '',
            `👤 Tú: ${OPTIONS[choice].emoji} ${choice}`,
            `🤖 Bot: ${OPTIONS[botChoice].emoji} ${botChoice}`,
            '',
            result,
            coins ? `🪙 +${formatNumber(coins)} monedas · ✨ +${xp} XP` : `✨ +${xp} XP`
        ].join('\n'));
    }
};
