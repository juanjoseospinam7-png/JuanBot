import config from '../../config.js';
import { error, warning } from '../../lib/format.js';
import { downloadMessageMedia, getMediaMessage, stickerToImage } from '../../lib/media.js';

export default {
    name: 'toimg',
    aliases: ['toimage', 'aimagen'],
    description: 'Convierte un sticker en imagen PNG',
    usage: `${config.prefix}toimg (responde a un sticker)`,
    category: 'stickers',
    emoji: '🖼️',
    cooldown: 5_000,
    async execute(ctx) {
        const media = getMediaMessage(ctx);
        if (!media || media.type !== 'stickerMessage') {
            await ctx.reply(warning(`Responde a un sticker con *${config.prefix}toimg* para convertirlo en imagen.`));
            return;
        }

        try {
            const buffer = await downloadMessageMedia(ctx.sock, media.message);
            const png = await stickerToImage(buffer);
            await ctx.sock.sendMessage(ctx.chatId, {
                image: png,
                caption: '🖼️ Sticker convertido a imagen'
            }, { quoted: ctx.msg });
        } catch (err) {
            ctx.logger.error('[TOIMG]', err);
            await ctx.reply(error('No pude convertir el sticker. Puede ser animado o estar dañado.'));
        }
    }
};
