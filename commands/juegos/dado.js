import crypto from 'node:crypto';
import config from '../../config.js';
import { warning } from '../../lib/format.js';

export default {
    name: 'dado',
    aliases: ['dice', 'dados'],
    description: 'Lanza un dado de las caras que elijas',
    usage: `${config.prefix}dado [caras]`,
    category: 'juegos',
    emoji: '🎲',
    cooldown: 3_000,
    async execute(ctx) {
        const sides = Number.parseInt(ctx.args[0], 10) || 6;
        if (sides < 2 || sides > 1_000) {
            await ctx.reply(warning('El dado debe tener entre *2* y *1000* caras.'));
            return;
        }

        const result = crypto.randomInt(1, sides + 1);
        const face = sides === 6 ? `🎲 Un dado de 6 caras…` : `🎲 Un dado de ${sides} caras…`;
        await ctx.reply([
            face,
            '',
            `🎯 *Resultado:* ${result}`,
            result === sides ? '🔥 ¡Cara máxima!' : result === 1 ? '😅 El mínimo.' : ''
        ].join('\n').trim());
    }
};
