import crypto from 'node:crypto';
import config from '../../config.js';
import { error, warning } from '../../lib/format.js';
import { renderListText } from '../../handlers/reactions.js';

export default {
    name: 'lista',
    aliases: ['sala', 'freefire'],
    description: 'Crea una lista de Free Fire con reacciones',
    usage: `${config.prefix}lista [código de sala]`,
    category: 'freefire',
    emoji: '🎮',
    permission: 'user',
    groupOnly: true,
    cooldown: 10_000,
    async execute(ctx) {
        const code = (ctx.rawArgs.trim() || `SALA-${crypto.randomInt(1000, 10000)}`).slice(0, 40);

        const previous = ctx.db.getActiveFreefireList(ctx.chatId);
        if (previous) {
            previous.active = false;
            ctx.db.putFreefireList(previous);
        }

        const now = Date.now();
        const list = {
            messageId: null,
            chatId: ctx.chatId,
            key: null,
            code,
            owner: ctx.senderId,
            participants: [],
            active: true,
            createdAt: now,
            updatedAt: now
        };

        try {
            const sent = await ctx.send(renderListText(list));
            if (!sent?.key) throw new Error('WhatsApp no devolvió la clave del mensaje.');
            list.messageId = sent.key.id;
            list.key = sent.key;
            ctx.db.putFreefireList(list);
            await ctx.react('✅');
        } catch (err) {
            ctx.logger.error('[FREEFIRE] No se pudo crear la lista:', err);
            await ctx.reply(error('No pude publicar la lista de Free Fire. Inténtalo de nuevo.'));
        }
    }
};
