import { bold, box, formatDuration, header, italic, quote } from './format.js';

export const CATEGORIES = [
    { key: 'info', emoji: '📚', title: 'INFORMACIÓN', description: 'Ayuda, estado y datos del bot' },
    { key: 'grupos', emoji: '👥', title: 'GRUPOS', description: 'Moderación y administración' },
    { key: 'stickers', emoji: '🎨', title: 'STICKERS', description: 'Crea y convierte stickers' },
    { key: 'rpg', emoji: '💰', title: 'RPG & ECONOMÍA', description: 'Trabaja, mina y gana monedas' },
    { key: 'freefire', emoji: '🎮', title: 'FREE FIRE', description: 'Salas y listas con reacciones' },
    { key: 'juegos', emoji: '🎲', title: 'JUEGOS', description: 'Retos y apuestas' },
    { key: 'descargas', emoji: '⬇️', title: 'DESCARGAS', description: 'Audio y video sin API key' },
    { key: 'owner', emoji: '👑', title: 'PROPIETARIO', description: 'Herramientas exclusivas', ownerOnly: true }
];

const normalizeKey = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export const getCategory = (value) => {
    const key = normalizeKey(value);
    if (!key) return null;
    return CATEGORIES.find((category) => (
        normalizeKey(category.key) === key ||
        normalizeKey(category.title) === key ||
        normalizeKey(category.emoji) === key
    )) ?? null;
};

const commandList = (commands) => [...new Map(
    [...commands.values()].map((command) => [command.name, command])
).values()]
    .filter((command) => !command.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

const categoryCommands = (commands, category, role) => commandList(commands).filter((command) => (
    command.category === category.key &&
    (!category.ownerOnly || role === 'owner')
));

const commandLine = (command, prefix) => `┃ ⋗ ${command.emoji || '•'} *${prefix}${command.name}* — ${command.description || 'Sin descripción'}`;

export const renderMainMenu = ({ commands, prefix, botName, role = 'user', pushName = '' }) => {
    const sections = [];
    let total = 0;

    for (const category of CATEGORIES) {
        if (category.ownerOnly && role !== 'owner') continue;
        const available = categoryCommands(commands, category, role);
        if (!available.length) continue;
        total += available.length;
        sections.push([
            `「 ${category.emoji} ${bold(category.title)} 」`,
            ...available.map((command) => commandLine(command, prefix))
        ].join('\n'));
    }

    const greeting = pushName ? `¡Hola, ${pushName}! ` : '';
    return [
        header(botName),
        '',
        `${greeting}${italic('Elige una categoría y descubre todo lo que puedo hacer.')}`,
        '',
        sections.join('\n\n'),
        '',
        `📖 ${bold('Submenús:')} ${prefix}menu info | ${prefix}menu grupos`,
        `🔎 ${bold('Ayuda:')} ${prefix}help <comando>`,
        `⚡ ${bold('Comandos activos:')} ${total}`,
        quote(`${botName} · WhatsApp Bot · 24/7`)
    ].join('\n');
};

export const renderCategoryMenu = ({ commands, category, prefix, botName, role = 'user' }) => {
    if (!category || (category.ownerOnly && role !== 'owner')) return null;
    const available = categoryCommands(commands, category, role);
    if (!available.length) return null;

    const lines = available.flatMap((command) => [
        `┃ ⋗ ${command.emoji || '•'} *${prefix}${command.name}*`,
        `┃    _${command.description || 'Sin descripción'}_`
    ]);

    return [
        box(category.title, lines, category.emoji),
        '',
        quote(`${category.description} · ${available.length} comandos`),
        `↩️ ${bold('Volver:')} ${prefix}menu`
    ].join('\n');
};

export const renderCommandHelp = ({ command, prefix, commands }) => {
    if (!command) return null;
    const aliases = command.aliases?.length
        ? command.aliases.map((alias) => `${prefix}${alias}`).join(', ')
        : 'Ninguno';
    const cooldown = command.cooldown ? formatDuration(command.cooldown) : 'Sin espera';
    const permission = {
        owner: '👑 Propietario',
        admin: '🛡️ Administrador del grupo',
        user: '👤 Usuario'
    }[command.permission || 'user'];

    const lines = [
        `🛠️ ${bold('Comando:')} ${prefix}${command.name}`,
        `📝 ${bold('Uso:')} ${command.usage || `${prefix}${command.name}`}`,
        `📖 ${bold('Descripción:')} ${command.description || 'Sin descripción'}`,
        `🔐 ${bold('Permiso:')} ${permission}`,
        `🔁 ${bold('Alias:')} ${aliases}`,
        `⏳ ${bold('Espera:')} ${cooldown}`
    ];

    if (command.groupOnly) lines.push('👥 Solo funciona en grupos.');
    if (command.botAdminRequired) lines.push('🛡️ El bot debe ser administrador.');

    const category = CATEGORIES.find((item) => item.key === command.category);
    return [
        box('AYUDA DEL COMANDO', lines, '❓'),
        '',
        `📂 ${bold('Categoría:')} ${category ? `${category.emoji} ${category.title}` : 'General'}`,
        `↩️ ${bold('Menú:')} ${prefix}menu${category ? ` ${category.key}` : ''}`
    ].join('\n');
};

export const categoryKeys = () => CATEGORIES.map((category) => category.key);

export const commandCount = (commands) => commandList(commands).length;
