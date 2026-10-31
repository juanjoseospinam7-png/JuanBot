import config from '../../config.js';
import { warning } from '../../lib/format.js';

export default {
    name: 'owner',
    aliases: ['propietario', 'creador'],
    description: 'Muestra el contacto del propietario del bot',
    usage: '..owner',
    category: 'info',
    emoji: '👑',
    cooldown: 5_000,
    async execute(ctx) {
        if (!config.ownerNumber) {
            await ctx.reply(warning('El propietario todavía no configuró su número en el bot.'));
            return;
        }

        const phone = config.ownerNumber;
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${config.botName} · Propietario`,
            `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
            'END:VCARD'
        ].join('\n');

        try {
            await ctx.sock.sendMessage(ctx.chatId, {
                contacts: {
                    displayName: `${config.botName} · Propietario`,
                    contacts: [{ vcard }]
                }
            }, { quoted: ctx.msg });
        } catch (error) {
            ctx.logger.warn('[OWNER] No se pudo enviar el contacto:', error.message);
        }

        await ctx.reply([
            '👑 *PROPIETARIO DE JUAN-BOT*',
            '',
            `📞 *Número:* +${phone}`,
            `💬 *WhatsApp:* https://wa.me/${phone}`,
            `🤖 *Bot:* ${config.botName}`,
            '',
            '_Para soporte, reportes o sugerencias._'
        ].join('\n'));
    }
};
