import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import webpmux from 'node-webpmux';
import config from '../config.js';
import { baileysLogger, logger } from './logger.js';
import { getMediaInfo, getQuotedMessage } from './message.js';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

const { Image } = webpmux;

export const getMediaMessage = (ctx) => {
    const current = getMediaInfo(ctx.msg);
    if (current.isMedia) return { message: ctx.msg, type: current.type, payload: current.payload };
    const quoted = getQuotedMessage(ctx.msg);
    if (quoted) {
        const quotedInfo = getMediaInfo(quoted);
        if (quotedInfo.isMedia) return { message: quoted, type: quotedInfo.type, payload: quotedInfo.payload };
    }
    return null;
};

export const downloadMessageMedia = async (sock, message) => {
    const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        { logger: baileysLogger, reuploadRequest: sock.updateMediaMessage }
    );
    if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('No se pudo descargar el archivo multimedia.');
    }
    return buffer;
};

const addStickerMetadata = async (webpBuffer) => {
    const image = new Image();
    await image.load(webpBuffer);
    const json = {
        'sticker-pack-id': 'juan-bot',
        'sticker-pack-name': config.stickerPack,
        'sticker-pack-publisher': config.stickerAuthor,
        emojis: ['🤖', '🪙'],
        'android-app-store-link': 'https://play.google.com/store/apps/details?id=com.whatsapp',
        'ios-app-store-link': 'https://apps.apple.com/app/whatsapp-messenger/id310633997'
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00,
        0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,
        0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    image.exif = exif;
    return image.save(null);
};

const ensureStickerSize = (buffer) => {
    if (!buffer?.length) throw new Error('El sticker quedó vacío.');
    if (buffer.length > config.maxStickerBytes) {
        throw new Error('El sticker supera 1 MB. Usa una imagen más liviana o un video más corto.');
    }
    return buffer;
};

const imageToSticker = async (buffer) => {
    const webp = await sharp(buffer, { animated: false })
        .rotate()
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 78, alphaQuality: 80 })
        .toBuffer();
    return ensureStickerSize(await addStickerMetadata(webp));
};

const videoToSticker = async (buffer, extension = 'mp4') => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'juan-sticker-'));
    const input = path.join(tempDir, `input-${crypto.randomUUID()}.${extension}`);
    const output = path.join(tempDir, 'output.webp');
    try {
        await fs.writeFile(input, buffer);
        await new Promise((resolve, reject) => {
            ffmpeg(input)
                .setStartTime(0)
                .duration(6)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                    '-loop', '0',
                    '-an',
                    '-vsync', '0',
                    '-preset', 'default',
                    '-quality', '70'
                ])
                .toFormat('webp')
                .on('end', resolve)
                .on('error', (error) => reject(new Error(`ffmpeg: ${error.message}`)))
                .save(output);
        });
        const webp = await fs.readFile(output);
        return ensureStickerSize(await addStickerMetadata(webp));
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch((error) => {
            logger.warn('[MEDIA] No se pudo limpiar temporales:', error.message);
        });
    }
};

export const createSticker = async ({ buffer, type, payload }) => {
    const mimetype = payload?.mimetype || '';
    if (type === 'stickerMessage') {
        return ensureStickerSize(await addStickerMetadata(buffer));
    }
    const isVideo = type === 'videoMessage' || mimetype.includes('gif') || mimetype.includes('video');
    if (isVideo) return videoToSticker(buffer, mimetype.includes('gif') ? 'gif' : 'mp4');
    if (type === 'imageMessage' || mimetype.startsWith('image/')) return imageToSticker(buffer);
    throw new Error('Formato no compatible. Envía una imagen, GIF o video.');
};

export const stickerToImage = async (buffer) => sharp(buffer, { animated: false })
    .png()
    .toBuffer();

export const __test__ = { ensureStickerSize };
