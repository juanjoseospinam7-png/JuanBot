import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import youtubedl from 'youtube-dl-exec';
import ffmpegStatic from 'ffmpeg-static';
import config from '../config.js';
import { logger } from './logger.js';

const isUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const baseFlags = () => {
    const flags = {
        noWarnings: true,
        noPlaylist: true,
        noCheckCertificates: true,
        restrictFilenames: true
    };
    if (config.ytdlpCookies) flags.cookies = config.ytdlpCookies;
    if (ffmpegStatic) flags.ffmpegLocation = ffmpegStatic;
    return flags;
};

const parseInfo = (raw) => {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.entries?.length) return parsed.entries[0];
    return parsed;
};

export const resolveInfo = async (query) => {
    const target = isUrl(query) ? query : `ytsearch1:${query}`;
    const raw = await youtubedl(target, {
        ...baseFlags(),
        dumpSingleJson: true,
        skipDownload: true,
        defaultSearch: 'ytsearch1'
    }, { timeout: config.downloadTimeoutMs });
    const info = parseInfo(raw);
    if (!info) throw new Error('No se encontró ningún resultado para esa búsqueda.');
    return {
        ...info,
        sourceUrl: info.webpage_url || info.original_url || (isUrl(query) ? query : null)
    };
};

const pickDownloadedFile = async (directory) => {
    const files = (await fs.readdir(directory))
        .filter((file) => !file.endsWith('.part') && !file.endsWith('.ytdl'))
        .map((file) => path.join(directory, file));
    if (!files.length) throw new Error('La descarga no generó ningún archivo.');
    const stats = await Promise.all(files.map(async (file) => ({ file, stat: await fs.stat(file) })));
    stats.sort((a, b) => b.stat.size - a.stat.size);
    return stats[0].file;
};

const runDownload = async (url, flags, timeout = config.downloadTimeoutMs) => {
    try {
        await youtubedl(url, { ...baseFlags(), ...flags }, { timeout });
    } catch (error) {
        const detail = String(error?.stderr || error?.message || error).trim().split('\n').slice(-3).join(' ');
        logger.error('[DOWNLOADS] yt-dlp falló:', detail);
        throw new Error(`No se pudo descargar el contenido. ${detail ? `Detalle: ${detail}` : ''}`.trim());
    }
};

export const downloadMedia = async ({ query, mode = 'audio' }) => {
    if (!query || !String(query).trim()) throw new Error('Debes indicar un enlace o una búsqueda.');
    const info = await resolveInfo(String(query).trim());
    const sourceUrl = info.sourceUrl || info.webpage_url;
    if (!sourceUrl) throw new Error('No se pudo obtener la URL del contenido.');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'juan-dl-'));
    const outputTemplate = path.join(tempDir, 'media.%(ext)s');
    const timeout = Math.max(30_000, config.downloadTimeoutMs);

    try {
        if (mode === 'audio') {
            await runDownload(sourceUrl, {
                output: outputTemplate,
                format: 'bestaudio/best',
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '128K',
                maxFilesize: `${Math.floor(config.maxDownloadBytes / 1024 / 1024)}M`
            }, timeout);
        } else {
            try {
                await runDownload(sourceUrl, {
                    output: outputTemplate,
                    format: 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b[height<=480]',
                    mergeOutputFormat: 'mp4',
                    maxFilesize: `${Math.floor(config.maxDownloadBytes / 1024 / 1024)}M`
                }, timeout);
            } catch (firstError) {
                logger.warn('[DOWNLOADS] Formato preferido falló, reintentando con formato básico.');
                await runDownload(sourceUrl, {
                    output: outputTemplate,
                    format: 'b',
                    maxFilesize: `${Math.floor(config.maxDownloadBytes / 1024 / 1024)}M`
                }, timeout);
            }
        }

        const filePath = await pickDownloadedFile(tempDir);
        const stat = await fs.stat(filePath);
        if (stat.size > config.maxDownloadBytes) {
            throw new Error(`El archivo pesa ${(stat.size / 1024 / 1024).toFixed(1)} MB y supera el límite de ${Math.floor(config.maxDownloadBytes / 1024 / 1024)} MB.`);
        }
        if (stat.size < 1024) throw new Error('El archivo descargado está vacío o incompleto.');

        const extension = path.extname(filePath).slice(1) || (mode === 'audio' ? 'mp3' : 'mp4');
        return {
            filePath,
            extension,
            size: stat.size,
            info: {
                title: info.title || 'Contenido',
                duration: Number(info.duration) || 0,
                uploader: info.uploader || info.channel || info.creator || '',
                thumbnail: info.thumbnail || '',
                webpageUrl: sourceUrl
            },
            cleanup: async () => {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            }
        };
    } catch (error) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
};

export const safeFileName = (name, extension) => {
    const base = String(name || 'archivo')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 60) || `archivo-${crypto.randomInt(1000, 9999)}`;
    return `${base}.${extension}`;
};

export const __test__ = { isUrl };
