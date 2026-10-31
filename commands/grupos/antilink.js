import config from '../../config.js';
import { success, warning } from '../../lib/format.js';

export default {
    name: 'antilink',
    aliases: ['antienlaces'],
    description: 'Activa o desactiva el filtro de enlaces',
    usage: `${config.prefix}antilink [on|off]`,
    category: 'grupos',
    emoji: '🛡️',
    permission: 'admin',
    groupOnly: true,
    cooldown: 3_000,
    async execute(ctx) {
        const group = ctx.db.getGroup(ctx.chatId);
        const option = String(ctx.args[0] ?? '').toLowerCase();
        let next;

        if (['on', '1', 'activar', 'enable'].includes(option)) next = true;
        else if (['off', '0', 'desactivar', 'disable'].includes(option)) next = false;
        else if (!option) next = !group.antilink;
        else {
            await ctx.reply(warning(`Opción inválida. Usa *${config.prefix}antilink on* o *${config.prefix}antilink off*.`));
            return;
        }

        group.antilink = next;
        ctx.db.touchGroup(ctx.chatId);

        await ctx.reply(success([
            next ? '🛡️ Antilink *activado*.' : '🔓 Antilink *desactivado*.',
            next ? `Los enlaces serán borrados y sancionados (${config.warningsBeforeKick} advertencias = expulsión).` : 'Los miembros pueden volver a compartir enlaces.'
        ].join('\n')));
    }
};
