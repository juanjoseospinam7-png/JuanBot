import os from 'node:os';
import config from '../../config.js';
import { box, formatDate, formatDuration, formatNumber, quote } from '../../lib/format.js';
import { getCommandCount } from '../../handlers/commandHandler.js';

export default {
    name: 'stats',
    aliases: ['estadisticas'],
    description: 'Estadísticas internas y de uso del bot',
    usage: `${config.prefix}stats`,
    category: 'owner',
    emoji: '📈',
    permission: 'owner',
    cooldown: 10_000,
    async execute(ctx) {
        const uptime = process.uptime() * 1000;
        const memory = process.memoryUsage();
        const users = Object.values(ctx.db.users);
        const totalCoins = users.reduce((sum, user) => sum + (Number(user.coins) || 0), 0);
        const lines = [
            `│ 🤖 *Bot:* ${config.botName} v3.0.0`,
            `│ ⏱️ *Activo:* ${formatDuration(uptime)}`,
            `│ 📅 *Inicio:* ${formatDate(Date.now() - uptime)}`,
            `│ 🧩 *Comandos:* ${getCommandCount()}`,
            `│ 👤 *Usuarios:* ${formatNumber(users.length)}`,
            `│ 👥 *Grupos:* ${formatNumber(Object.keys(ctx.db.groups).length)}`,
            `│ 🎮 *Listas FF:* ${formatNumber(Object.keys(ctx.db.lists).length)}`,
            `│ 🪙 *Monedas totales:* ${formatNumber(totalCoins)}`,
            `│ 🔗 *Alias LID/PN:* ${formatNumber(Object.keys(ctx.db.aliases.byLid ?? {}).length)}`,
            `│ 🧠 *RSS:* ${(memory.rss / 1024 / 1024).toFixed(1)} MB`,
            `│ 📊 *Heap:* ${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB`,
            `│ ⚙️ *Node:* ${process.version}`,
            `│ 🖥️ *Sistema:* ${os.type()} ${os.arch()}`,
            `│ 🆔 *PID:* ${process.pid}`
        ];

        await ctx.reply([
            box('ESTADÍSTICAS', lines, '📈'),
            '',
            quote(`Uptime del proceso: ${formatDuration(uptime)}`)
        ].join('\n'));
    }
};
