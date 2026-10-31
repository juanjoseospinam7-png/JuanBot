import config from '../../config.js';
import { info, success } from '../../lib/format.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';

export default {
    name: 'unmute',
    aliases: ['abrir'],
    description: 'Abre el grupo para que todos puedan hablar',
    usage: `${config.prefix}unmute`,
    category: 'grupos',
    emoji: '🔊',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 3_000,
    async execute(ctx) {
        if (ctx.groupMetadata?.announce === false) {
            await ctx.reply(info('El grupo ya está abierto.'));
            return;
        }
        try {
            await ctx.sock.groupSettingUpdate(ctx.chatId, 'not_announcement');
            invalidateGroupCache(ctx.chatId);
            await ctx.reply(success('🔊 Grupo abierto. Todos los miembros pueden escribir.'));
        } catch (error) {
            ctx.logger.error('[UNMUTE]', error);
            await ctx.reply('❌ No pude abrir el grupo. Revisa mis permisos de administrador.');
        }
    }
};
