import config from '../../config.js';
import { box, warning } from '../../lib/format.js';
import { getCommand } from '../../handlers/commandHandler.js';
import { CATEGORIES, renderCommandHelp } from '../../lib/menus.js';

export default {
    name: 'help',
    aliases: ['ayuda'],
    description: 'Muestra la ayuda de un comando',
    usage: `${config.prefix}help <comando>`,
    category: 'info',
    emoji: '❓',
    cooldown: 2_000,
    async execute(ctx) {
        const query = String(ctx.args[0] ?? '').replace(config.prefix, '').toLowerCase();
        if (!query) {
            const lines = CATEGORIES
                .filter((category) => !category.ownerOnly || ctx.isOwner)
                .map((category) => `│ ${category.emoji} *${category.key}* — ${category.description}`);
            await ctx.reply([
                box('AYUDA', lines, '❓'),
                '',
                `Escribe *${config.prefix}help <comando>* para ver su uso exacto.`,
                `Ejemplo: *${config.prefix}help kick*`,
                `También puedes usar *${config.prefix}menu* para navegar.`
            ].join('\n'));
            return;
        }

        const command = getCommand(query);
        if (!command) {
            await ctx.reply(warning(`No encontré el comando *${config.prefix}${query}*.\nPrueba con *${config.prefix}menu*.`));
            return;
        }

        const rendered = renderCommandHelp({
            command,
            prefix: config.prefix,
            commands: ctx.registry
        });
        await ctx.reply(rendered);
    }
};
