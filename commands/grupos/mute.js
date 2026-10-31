import config from '../../config.js';
import { info, success } from '../../lib/format.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';

export default {
    name: 'mute',
    aliases: ['cerrar'],
    description: 'Cierra el grupo para que solo hablen administradores',
    usage: `${config.prefix}mute`,
    category: 'grupos',
    emoji: '🔇',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 3_000,
    async execute(ctx) {
        if (ctx.groupMetadata?.announce) {
            await ctx.reply(info('El grupo ya está cerrado.'));
            return;
        }
        try {
            await ctx.sock.groupSettingUpdate(ctx.chatId, 'announcement');
            invalidateGroupCache(ctx.chatId);
            await ctx.reply(success('🔇 Grupo cerrado. Solo los administradores pueden enviar mensajes.'));
        } catch (error) {
            ctx.logger.error('[MUTE]', error);
            await ctx.reply('❌ No pude cerrar el grupo. Revisa mis permisos de administrador.');
        }
    }
};
