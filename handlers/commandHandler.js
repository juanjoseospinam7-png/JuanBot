import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import config from '../config.js';
import { logger } from '../lib/logger.js';

const commandsDir = path.join(config.rootDir, 'commands');

let commands = new Map();
let passiveHandlers = [];

const walk = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('_')) {
            files.push(fullPath);
        }
    }
    return files;
};

const register = (registry, module, filePath) => {
    const command = module?.default ?? module;
    if (!command || typeof command !== 'object') {
        logger.warn(`[COMANDOS] ${path.basename(filePath)} no exporta un objeto válido.`);
        return null;
    }
    if (typeof command.name !== 'string' || !command.name.trim()) {
        logger.warn(`[COMANDOS] ${path.basename(filePath)} no tiene "name".`);
        return null;
    }
    if (typeof command.execute !== 'function') {
        logger.warn(`[COMANDOS] ${path.basename(filePath)} no tiene "execute".`);
        return null;
    }

    const normalized = {
        ...command,
        name: command.name.trim().toLowerCase(),
        aliases: (command.aliases ?? []).map((alias) => String(alias).trim().toLowerCase()).filter(Boolean),
        permission: command.permission || 'user',
        category: command.category || 'info',
        emoji: command.emoji || '•',
        cooldown: Number(command.cooldown) || config.defaultCooldownMs,
        filePath
    };

    if (registry.has(normalized.name)) {
        logger.error(`[COMANDOS] Comando duplicado "${normalized.name}" en ${path.basename(filePath)}. Se omite.`);
        return null;
    }

    registry.set(normalized.name, normalized);
    for (const alias of normalized.aliases) {
        if (registry.has(alias)) {
            logger.warn(`[COMANDOS] Alias duplicado "${alias}" en ${path.basename(filePath)}. Se omite.`);
            continue;
        }
        registry.set(alias, normalized);
    }

    return normalized;
};

export const loadCommands = async () => {
    const registry = new Map();
    const passives = [];
    let files = [];
    try {
        files = await walk(commandsDir);
    } catch (error) {
        logger.error('[COMANDOS] No se pudo leer la carpeta commands/:', error.message);
        commands = registry;
        passiveHandlers = passives;
        return registry;
    }

    for (const file of files) {
        try {
            const stat = await fs.stat(file);
            const url = `${pathToFileURL(file).href}?v=${stat.mtimeMs}`;
            const module = await import(url);
            const registered = register(registry, module, file);
            if (registered && typeof registered.onMessage === 'function') {
                passives.push(registered);
            }
        } catch (error) {
            logger.error(`[COMANDOS] Error importando ${path.relative(config.rootDir, file)}:`, error);
        }
    }

    commands = registry;
    passiveHandlers = passives;
    logger.info(`[COMANDOS] ${new Set([...registry.values()]).size} comandos cargados (${registry.size} nombres/alias).`);
    return registry;
};

export const reloadCommands = async () => {
    logger.info('[COMANDOS] Recargando módulos...');
    return loadCommands();
};

export const getCommands = () => commands;
export const getCommand = (name) => commands.get(String(name ?? '').toLowerCase()) ?? null;
export const getPassiveHandlers = () => [...passiveHandlers];
export const getCommandCount = () => new Set([...commands.values()]).size;
