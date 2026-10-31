import config from '../../config.js';
import { error, success } from '../../lib/format.js';

export default {
    name: 'link',
    aliases: ['enlace', 'invite'],
    description: 'Obtiene el enlace de invitación del grupo',
    usage: `${config.prefix}link`,
    category: 'grupos',
    emoji: '🔗',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 5_000,
    async execute(ctx) {
        try {
            const code = await ctx.sock.groupInviteCode(ctx.chatId);
            await ctx.reply(success(`🔗 Enlace del grupo:\nhttps://chat.whatsapp.com/${code}`));
        } catch (err) {
            ctx.logger.error('[LINK]', err);
            await ctx.reply(error('No pude obtener el enlace. Asegúrate de que yo sea administrador.'));
        }
    }
};
