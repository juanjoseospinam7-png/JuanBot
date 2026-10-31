import os from 'node:os';
import config from '../../config.js';
import { box, formatDate, formatDuration, formatNumber, quote } from '../../lib/format.js';
import { getCommandCount } from '../../handlers/commandHandler.js';

export default {
    name: 'runtime',
    aliases: ['uptime', 'estado'],
    description: 'Muestra el estado y tiempo activo del bot',
    usage: '..runtime',
    category: 'info',
    emoji: '⏱️',
    cooldown: 3_000,
    async execute(ctx) {
        const uptime = process.uptime() * 1000;
        const memory = process.memoryUsage();
        const started = new Date(Date.now() - uptime);
        const lines = [
            `│ 🤖 *Bot:* ${config.botName}`,
            `│ ⏱️ *Activo:* ${formatDuration(uptime)}`,
            `│ 📅 *Inicio:* ${formatDate(started.getTime())}`,
            `│ 🧠 *RAM:* ${(memory.rss / 1024 / 1024).toFixed(1)} MB`,
            `│ 🧩 *Comandos:* ${getCommandCount()}`,
            `│ 👤 *Usuarios:* ${formatNumber(Object.keys(ctx.db.users).length)}`,
            `│ 👥 *Grupos:* ${formatNumber(Object.keys(ctx.db.groups).length)}`,
            `│ ⚙️ *Node:* ${process.version}`,
            `│ 🖥️ *Sistema:* ${os.type()} ${os.arch()}`,
            `│ 🆔 *PID:* ${process.pid}`
        ];

        await ctx.reply([
            box('ESTADO DEL BOT', lines, '📊'),
            '',
            quote(`${config.botName} funcionando 24/7`)
        ].join('\n'));
    }
};
