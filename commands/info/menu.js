import config from '../../config.js';
import { warning } from '../../lib/format.js';
import { CATEGORIES, getCategory, renderCategoryMenu, renderMainMenu } from '../../lib/menus.js';

export default {
    name: 'menu',
    aliases: ['men', 'comandos'],
    description: 'Muestra el menú principal o una categoría',
    usage: `${config.prefix}menu [categoría]`,
    category: 'info',
    emoji: '📚',
    cooldown: 2_000,
    async execute(ctx) {
        const query = ctx.args[0];
        if (query) {
            const category = getCategory(query);
            if (!category) {
                await ctx.reply(warning([
                    `La categoría *${query}* no existe.`,
                    `Disponibles: ${CATEGORIES.filter((item) => !item.ownerOnly || ctx.isOwner).map((item) => `*${item.key}*`).join(', ')}`
                ].join('\n')));
                return;
            }
            const rendered = renderCategoryMenu({
                commands: ctx.registry,
                category,
                prefix: config.prefix,
                botName: config.botName,
                role: ctx.isOwner ? 'owner' : 'user'
            });
            if (!rendered) {
                await ctx.reply(warning('No hay comandos disponibles en esa categoría.'));
                return;
            }
            await ctx.reply(rendered);
            return;
        }

        await ctx.reply(renderMainMenu({
            commands: ctx.registry,
            prefix: config.prefix,
            botName: config.botName,
            role: ctx.isOwner ? 'owner' : 'user',
            pushName: ctx.pushName
        }));
    }
};
