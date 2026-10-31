import config from '../../config.js';
import { error, warning } from '../../lib/format.js';
import { createSticker, downloadMessageMedia, getMediaMessage } from '../../lib/media.js';

export default {
    name: 's',
    aliases: ['sticker', 'stiker'],
    description: 'Convierte una imagen, GIF o video en sticker',
    usage: `${config.prefix}s (responde a una imagen, GIF o video)`,
    category: 'stickers',
    emoji: '🎨',
    cooldown: 5_000,
    async execute(ctx) {
        const media = getMediaMessage(ctx);
        if (!media) {
            await ctx.reply(warning(`Envía o responde a una imagen, GIF o video (máx. 6 s) con *${config.prefix}s*.`));
            return;
        }

        try {
            await ctx.react('⏳');
            const buffer = await downloadMessageMedia(ctx.sock, media.message);
            const sticker = await createSticker({
                buffer,
                type: media.type,
                payload: media.payload
            });
            await ctx.sock.sendMessage(ctx.chatId, { sticker }, { quoted: ctx.msg });
            await ctx.react('✅');
        } catch (err) {
            ctx.logger.error('[STICKER]', err);
            await ctx.react('❌');
            await ctx.reply(error(err.message || 'No pude crear el sticker.'));
        }
    }
};
