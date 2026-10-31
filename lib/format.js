const LINE = '─';

export const bold = (text) => `*${text}*`;
export const italic = (text) => `_${text}_`;
export const strike = (text) => `~${text}~`;
export const mono = (text) => `\`\`\`${text}\`\`\``;
export const quote = (text) => `> ${String(text).split('\n').join('\n> ')}`;

export const box = (title, lines, emoji = '') => {
    const safeLines = (Array.isArray(lines) ? lines : [lines]).map((line) => {
        const value = String(line);
        return /^[│┃]/.test(value) ? value : `│ ${value}`;
    });
    const header = `╭─${emoji ? ` ${emoji} ` : ' '}「 *${title}* 」`;
    return [
        header,
        `├${LINE.repeat(30)}`,
        ...safeLines,
        `╰${LINE.repeat(30)}╯`
    ].join('\n');
};

export const header = (botName) => [
    '╭━━━━━━━━━━━━━━━━━━━━━━╮',
    `┃   🪙 *${botName}* 🪙`,
    '┃   _Asistente 24/7_',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
].join('\n');

export const success = (text) => `✅ *ÉXITO*\n${quote(text)}`;
export const error = (text) => `❌ *ERROR*\n${quote(text)}`;
export const warning = (text) => `⚠️ *AVISO*\n${quote(text)}`;
export const info = (text) => `ℹ️ *INFORMACIÓN*\n${quote(text)}`;
export const denied = (text) => `🚫 *ACCESO DENEGADO*\n${quote(text)}`;

export const formatNumber = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString('es-CO');
};

export const formatDuration = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
};

export const progressBar = (current, total, size = 10) => {
    const safeTotal = Math.max(1, Number(total) || 1);
    const ratio = Math.max(0, Math.min(1, (Number(current) || 0) / safeTotal));
    const filled = Math.round(ratio * size);
    return `[${'█'.repeat(filled)}${'░'.repeat(Math.max(0, size - filled))}] ${Math.round(ratio * 100)}%`;
};

export const truncate = (text, max = 120) => {
    const value = String(text ?? '');
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

export const formatDate = (timestamp = Date.now()) => new Date(timestamp).toLocaleString('es-CO', {
    timeZone: process.env.TZ || 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short'
});

export const bullet = (emoji, command, description) => `┃ ⋗ ${emoji} *${command}* — ${description}`;
