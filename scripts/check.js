import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import config from '../config.js';
import { closeLogger, logger } from '../lib/logger.js';
import { getCommands, getCommandCount, loadCommands } from '../handlers/commandHandler.js';

const EXPECTED = [
    'menu', 'help', 'ping', 'runtime', 'owner',
    'kick', 'mute', 'unmute', 'todos', 'link', 'warn', 'warns', 'promote', 'demote', 'antilink',
    's', 'toimg',
    'work', 'minar', 'daily', 'balance', 'pay', 'top', 'perfil',
    'lista', 'donarsala',
    'ppt', 'dado', 'trivia', 'ruleta',
    'play', 'yt', 'tiktok',
    'reload', 'backup', 'broadcast', 'stats'
];

const failures = [];
const warnings = [];

const walk = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walk(full));
        else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
    }
    return files;
};

const importAll = async () => {
    for (const root of ['lib', 'handlers', 'commands']) {
        const files = await walk(path.join(config.rootDir, root));
        for (const file of files) {
            try {
                await import(pathToFileURL(file).href);
            } catch (error) {
                failures.push(`No se pudo importar ${path.relative(config.rootDir, file)}: ${error.message}`);
            }
        }
    }
};

const validate = () => {
    if (config.prefix !== '..') failures.push(`El prefijo debe ser "..", actual: "${config.prefix}".`);
    if (!config.ownerNumber) warnings.push('OWNER_NUMBER vacío: los comandos de propietario quedan bloqueados.');

    const registry = getCommands();
    const unique = [...new Map([...registry.values()].map((command) => [command.name, command])).values()];

    for (const name of EXPECTED) {
        if (!registry.has(name)) failures.push(`Falta el comando obligatorio: ${name}`);
    }

    for (const command of unique) {
        if (!command.description) failures.push(`${command.name}: falta description.`);
        if (!command.category) failures.push(`${command.name}: falta category.`);
        if (!command.usage) failures.push(`${command.name}: falta usage.`);
        if (typeof command.execute !== 'function') failures.push(`${command.name}: execute inválido.`);
        if (!Number.isFinite(command.cooldown) || command.cooldown < 0) failures.push(`${command.name}: cooldown inválido.`);
    }

    if (unique.length !== getCommandCount()) failures.push('El conteo de comandos no coincide con el registro.');

    logger.info(`[CHECK] ${unique.length} comandos únicos · ${registry.size} nombres/alias.`);
    for (const name of EXPECTED) {
        const command = registry.get(name);
        if (command) logger.info(`  ✓ ${config.prefix}${name} (${command.category})`);
    }
};

const run = async () => {
    await importAll();
    await loadCommands();
    validate();

    for (const warning of warnings) logger.warn(`[CHECK] ${warning}`);
    for (const failure of failures) logger.error(`[CHECK] ${failure}`);

    if (failures.length) {
        logger.error(`[CHECK] Fallaron ${failures.length} verificaciones.`);
        process.exitCode = 1;
    } else {
        logger.info('[CHECK] Todo correcto. El bot está listo para iniciar.');
    }
    await closeLogger();
};

run().catch(async (error) => {
    logger.error('[CHECK] Error fatal:', error);
    await closeLogger();
    process.exitCode = 1;
});
