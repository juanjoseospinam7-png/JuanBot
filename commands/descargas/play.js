import fs from 'node:fs/promises';
import config from '../../config.js';
import { error, formatDuration, warning } from '../../lib/format.js';
import { downloadMedia, safeFileName } from '../../lib/downloader.js';

export default {
    name: 'play',
    aliases: ['musica', 'audio'],
    description: 'Busca y descarga audio de YouTube',
    usage: `${config.prefix}play <canción o enlace>`,
    category: 'descargas',
    emoji: '🎵',
    permission: 'user',
    cooldown: 15_000,
    async execute(ctx) {
        const query = ctx.rawArgs.trim();
        if (!query) {
            await ctx.reply(warning(`Escribe el nombre o enlace de la canción.\n\n*Uso:* ${config.prefix}play bad bunny`));
            return;
        }

        let result;
        try {
            await ctx.react('⏳');
            result = await downloadMedia({ query, mode: 'audio' });
            if (result.size > 15 * 1024 * 1024) {
                throw new Error('El audio supera el límite de 15 MB de WhatsApp. Prueba con una canción más corta.');
            }

            const buffer = await fs.readFile(result.filePath);
            await ctx.reply([
                '🎵 *AUDIO ENCONTRADO*',
                '',
                `📌 *Título:* ${result.info.title}`,
                `👤 *Autor:* ${result.info.uploader || 'Desconocido'}`,
                `⏱️ *Duración:* ${formatDuration(result.info.duration * 1000)}`,
                `📦 *Tamaño:* ${(result.size / 1024 / 1024).toFixed(1)} MB`
            ].join('\n'));

            await ctx.sock.sendMessage(ctx.chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: safeFileName(result.info.title, 'mp3'),
                ptt: false
            }, { quoted: ctx.msg });
            await ctx.react('✅');
        } catch (err) {
            ctx.logger.error('[PLAY]', err);
            await ctx.react('❌');
            await ctx.reply(error(err.message || 'No pude descargar ese audio.'));
        } finally {
            if (result?.cleanup) await result.cleanup();
        }
    }
};
