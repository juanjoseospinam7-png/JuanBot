import fs from 'node:fs/promises';
import config from '../../config.js';
import { error, formatDuration, warning } from '../../lib/format.js';
import { downloadMedia, safeFileName } from '../../lib/downloader.js';

export default {
    name: 'yt',
    aliases: ['video', 'ytvideo'],
    description: 'Descarga un video de YouTube',
    usage: `${config.prefix}yt <búsqueda o enlace>`,
    category: 'descargas',
    emoji: '🎬',
    permission: 'user',
    cooldown: 20_000,
    async execute(ctx) {
        const query = ctx.rawArgs.trim();
        if (!query) {
            await ctx.reply(warning(`Escribe el nombre o enlace del video.\n\n*Uso:* ${config.prefix}yt música relajante`));
            return;
        }

        let result;
        try {
            await ctx.react('⏳');
            result = await downloadMedia({ query, mode: 'video' });
            const buffer = await fs.readFile(result.filePath);
            const caption = [
                '🎬 *VIDEO DESCARGADO*',
                '',
                `📌 *Título:* ${result.info.title}`,
                `👤 *Autor:* ${result.info.uploader || 'Desconocido'}`,
                `⏱️ *Duración:* ${formatDuration(result.info.duration * 1000)}`,
                `📦 *Tamaño:* ${(result.size / 1024 / 1024).toFixed(1)} MB`
            ].join('\n');

            await ctx.sock.sendMessage(ctx.chatId, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: safeFileName(result.info.title, 'mp4'),
                caption
            }, { quoted: ctx.msg });
            await ctx.react('✅');
        } catch (err) {
            ctx.logger.error('[YT]', err);
            await ctx.react('❌');
            await ctx.reply(error(err.message || 'No pude descargar ese video.'));
        } finally {
            if (result?.cleanup) await result.cleanup();
        }
    }
};
