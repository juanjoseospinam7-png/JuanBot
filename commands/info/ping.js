import { formatDuration } from '../../lib/format.js';

export default {
    name: 'ping',
    description: 'Comprueba la velocidad de respuesta del bot',
    usage: '..ping',
    category: 'info',
    emoji: '🏓',
    cooldown: 2_000,
    async execute(ctx) {
        const started = Date.now();
        const sent = await ctx.reply('🏓 *Pong...*');
        const latency = Date.now() - started;
        const text = [
            '🏓 *PONG*',
            '',
            `⚡ *Latencia:* ${latency} ms`,
            `⏱️ *Activo:* ${formatDuration(process.uptime() * 1000)}`,
            `📦 *Memoria:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`
        ].join('\n');

        try {
            await ctx.sock.sendMessage(ctx.chatId, { text, edit: sent.key });
        } catch {
            await ctx.reply(text);
        }
    }
};
