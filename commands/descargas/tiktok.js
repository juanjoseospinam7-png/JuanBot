import fs from 'node:fs/promises';
import config from '../../config.js';
import { error, warning } from '../../lib/format.js';
import { downloadMedia, safeFileName } from '../../lib/downloader.js';

const isTikTok = (value) => {
    try {
        const url = new URL(value);
        return /(^|\.)tiktok\.com$/i.test(url.hostname);
    } catch {
        return false;
    }
};

export default {
    name: 'tiktok',
    aliases: ['tt'],
    description: 'Descarga un video de TikTok sin marca de agua',
    usage: `${config.prefix}tiktok <enlace>`,
    category: 'descargas',
    emoji: '📱',
    permission: 'user',
    cooldown: 20_000,
    async execute(ctx) {
        const query = ctx.rawArgs.trim();
        if (!isTikTok(query)) {
            await ctx.reply(warning(`Envía un enlace válido de TikTok.\n\n*Uso:* ${config.prefix}tiktok https://vm.tiktok.com/...`));
            return;
        }

        let result;
        try {
            await ctx.react('⏳');
            result = await downloadMedia({ query, mode: 'video' });
            const buffer = await fs.readFile(result.filePath);
            await ctx.sock.sendMessage(ctx.chatId, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: safeFileName(result.info.title, 'mp4'),
                caption: [
                    '📱 *TIKTOK DESCARGADO*',
                    '',
                    `📌 ${result.info.title}`,
                    result.info.uploader ? `👤 ${result.info.uploader}` : null,
                    `📦 ${(result.size / 1024 / 1024).toFixed(1)} MB`
                ].filter(Boolean).join('\n')
            }, { quoted: ctx.msg });
            await ctx.react('✅');
        } catch (err) {
            ctx.logger.error('[TIKTOK]', err);
            await ctx.react('❌');
            await ctx.reply(error(err.message || 'No pude descargar ese TikTok.'));
        } finally {
            if (result?.cleanup) await result.cleanup();
        }
    }
};
