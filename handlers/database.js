import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';
import { logger } from '../lib/logger.js';
import { normalizeJid } from '../lib/jid.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeDefaults = (target, defaults) => {
    for (const [key, value] of Object.entries(defaults)) {
        if (target[key] === undefined) {
            target[key] = clone(value);
        } else if (isObject(target[key]) && isObject(value)) {
            mergeDefaults(target[key], value);
        }
    }
    return target;
};

const timestampName = () => new Date().toISOString().replace(/[:.]/g, '-');

const DEFAULT_USERS = { users: {} };
const DEFAULT_GROUPS = { groups: {} };
const DEFAULT_FREEFIRE = { lists: {} };
const DEFAULT_ALIASES = { byLid: {}, byPn: {} };

const newUser = (jid) => ({
    jid,
    name: null,
    coins: 0,
    xp: 0,
    level: 1,
    warns: 0,
    lastWork: 0,
    lastMine: 0,
    lastDaily: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
});

const newGroup = (jid) => ({
    jid,
    muted: false,
    antilink: false,
    welcome: false,
    warns: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
});

export class JsonStore {
    constructor(name, filePath, defaults, backupsDir) {
        this.name = name;
        this.filePath = filePath;
        this.defaults = defaults;
        this.backupsDir = backupsDir;
        this.data = clone(defaults);
        this.dirty = false;
        this.timer = null;
        this.pending = Promise.resolve();
    }

    async init() {
        await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
        await fsp.mkdir(this.backupsDir, { recursive: true });
        const loaded = await this.#load();
        this.data = mergeDefaults(loaded ?? clone(this.defaults), this.defaults);
        if (!loaded || !fs.existsSync(this.filePath)) await this.saveNow();
    }

    async #load() {
        try {
            const raw = await fsp.readFile(this.filePath, 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            logger.error(`[DB:${this.name}] JSON inválido o ilegible:`, error.message);
            try {
                const corrupt = `${this.filePath}.corrupt-${timestampName()}`;
                await fsp.rename(this.filePath, corrupt);
                logger.warn(`[DB:${this.name}] Archivo corrupto movido a ${path.basename(corrupt)}`);
            } catch (renameError) {
                logger.error(`[DB:${this.name}] No se pudo mover el archivo corrupto:`, renameError.message);
            }
            return await this.#loadLatestBackup();
        }
    }

    async #loadLatestBackup() {
        try {
            const base = path.basename(this.filePath, '.json');
            const files = (await fsp.readdir(this.backupsDir))
                .filter((file) => file.startsWith(`${base}-`) && file.endsWith('.json'))
                .sort()
                .reverse();
            for (const file of files) {
                try {
                    const raw = await fsp.readFile(path.join(this.backupsDir, file), 'utf8');
                    const parsed = JSON.parse(raw);
                    logger.warn(`[DB:${this.name}] Recuperado desde backup ${file}`);
                    return parsed;
                } catch {
                    // Se intenta con el siguiente backup.
                }
            }
        } catch (error) {
            logger.error(`[DB:${this.name}] No se pudieron leer backups:`, error.message);
        }
        return null;
    }

    schedule() {
        this.dirty = true;
        if (this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.saveNow().catch((error) => {
                logger.error(`[DB:${this.name}] Error guardando:`, error);
            });
        }, 120);
        this.timer.unref?.();
    }

    saveNow() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.pending = this.pending.then(() => this.#write());
        return this.pending;
    }

    async #write() {
        try {
            await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
            await fsp.mkdir(this.backupsDir, { recursive: true });
            if (fs.existsSync(this.filePath)) {
                const base = path.basename(this.filePath, '.json');
                const backup = path.join(this.backupsDir, `${base}-${timestampName()}.json`);
                await fsp.copyFile(this.filePath, backup);
                await this.#pruneBackups(base);
            }

            const temp = `${this.filePath}.${process.pid}.tmp`;
            const payload = `${JSON.stringify(this.data, null, 2)}\n`;
            await fsp.writeFile(temp, payload, 'utf8');
            try {
                await fsp.rename(temp, this.filePath);
            } catch {
                await fsp.rm(this.filePath, { force: true });
                await fsp.rename(temp, this.filePath);
            }
            this.dirty = false;
        } catch (error) {
            logger.error(`[DB:${this.name}] Falló la escritura atómica:`, error);
            throw error;
        }
    }

    async #pruneBackups(base) {
        try {
            const files = (await fsp.readdir(this.backupsDir))
                .filter((file) => file.startsWith(`${base}-`) && file.endsWith('.json'))
                .sort();
            const excess = files.slice(0, Math.max(0, files.length - 10));
            await Promise.all(excess.map((file) => fsp.rm(path.join(this.backupsDir, file), { force: true })));
        } catch (error) {
            logger.warn(`[DB:${this.name}] No se pudieron limpiar backups:`, error.message);
        }
    }

    flushSync() {
        try {
            fs.mkdirSync(this.backupsDir, { recursive: true });
            const temp = `${this.filePath}.${process.pid}.exit.tmp`;
            fs.writeFileSync(temp, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
            try {
                fs.renameSync(temp, this.filePath);
            } catch {
                fs.rmSync(this.filePath, { force: true });
                fs.renameSync(temp, this.filePath);
            }
        } catch (error) {
            logger.error(`[DB:${this.name}] Flush de salida falló:`, error);
        }
    }
}

export class Database {
    constructor({ directory = config.databaseDir } = {}) {
        this.directory = directory;
        this.backupsDir = path.join(directory, 'backups');
        this.stores = {
            users: new JsonStore('users', path.join(directory, 'users.json'), DEFAULT_USERS, this.backupsDir),
            groups: new JsonStore('groups', path.join(directory, 'groups.json'), DEFAULT_GROUPS, this.backupsDir),
            freefire: new JsonStore('freefire', path.join(directory, 'freefire.json'), DEFAULT_FREEFIRE, this.backupsDir),
            aliases: new JsonStore('aliases', path.join(directory, 'aliases.json'), DEFAULT_ALIASES, this.backupsDir)
        };
    }

    async init() {
        await fsp.mkdir(this.directory, { recursive: true });
        for (const store of Object.values(this.stores)) {
            await store.init();
        }
        this.installExitHook();
        logger.info('[DB] Persistencia inicializada correctamente.');
    }

    installExitHook() {
        if (this.exitHookInstalled) return;
        this.exitHookInstalled = true;
        process.once('exit', () => this.flushSync());
    }

    get users() {
        return this.stores.users.data.users;
    }

    get groups() {
        return this.stores.groups.data.groups;
    }

    get lists() {
        return this.stores.freefire.data.lists;
    }

    get aliases() {
        return this.stores.aliases.data;
    }

    canonicalJid(jid) {
        const normalized = normalizeJid(jid);
        if (!normalized) return normalized;
        if (normalized.endsWith('@lid')) {
            return this.aliases.byLid[normalized] || normalized;
        }
        return normalized;
    }

    linkAlias(lidJid, pnJid) {
        const lid = normalizeJid(lidJid);
        const pn = normalizeJid(pnJid);
        if (!lid.endsWith('@lid') || !pn.endsWith('@s.whatsapp.net')) return false;
        if (this.aliases.byLid[lid] === pn) return false;
        this.aliases.byLid[lid] = pn;
        this.aliases.byPn[pn] = lid;
        this.stores.aliases.schedule();
        return true;
    }

    getUser(jid) {
        const key = this.canonicalJid(jid) || normalizeJid(jid);
        if (!key) return null;
        if (!this.users[key]) {
            this.users[key] = newUser(key);
            this.stores.users.schedule();
        }
        return this.users[key];
    }

    touchUser(jid) {
        const user = this.getUser(jid);
        if (user) {
            user.updatedAt = Date.now();
            this.stores.users.schedule();
        }
        return user;
    }

    getUserByPhone(phone) {
        const digits = String(phone ?? '').replace(/\D/g, '');
        if (!digits) return null;
        return Object.values(this.users).find((user) => String(user.jid).startsWith(`${digits}@`)) ?? null;
    }

    getGroup(jid) {
        const key = normalizeJid(jid);
        if (!key.endsWith('@g.us')) return null;
        if (!this.groups[key]) {
            this.groups[key] = newGroup(key);
            this.stores.groups.schedule();
        }
        return this.groups[key];
    }

    touchGroup(jid) {
        const group = this.getGroup(jid);
        if (group) {
            group.updatedAt = Date.now();
            this.stores.groups.schedule();
        }
        return group;
    }

    getFreefireList(messageId) {
        return messageId ? this.lists[messageId] ?? null : null;
    }

    getActiveFreefireList(chatId) {
        const key = normalizeJid(chatId);
        return Object.values(this.lists)
            .filter((list) => normalizeJid(list.chatId) === key && list.active !== false)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] ?? null;
    }

    putFreefireList(list) {
        if (!list?.messageId) return null;
        this.lists[list.messageId] = list;
        this.stores.freefire.schedule();
        return list;
    }

    deleteFreefireList(messageId) {
        if (!this.lists[messageId]) return false;
        delete this.lists[messageId];
        this.stores.freefire.schedule();
        return true;
    }

    async flush() {
        await Promise.all(Object.values(this.stores).map((store) => store.saveNow()));
    }

    flushSync() {
        for (const store of Object.values(this.stores)) store.flushSync();
    }

    async backupNow(label = 'manual') {
        const destination = path.join(this.backupsDir, `${label}-${timestampName()}`);
        await fsp.mkdir(destination, { recursive: true });
        for (const store of Object.values(this.stores)) {
            await store.saveNow();
            if (fs.existsSync(store.filePath)) {
                await fsp.copyFile(store.filePath, path.join(destination, path.basename(store.filePath)));
            }
        }
        return destination;
    }
}

export const db = new Database();

export const __test__ = { JsonStore, mergeDefaults, newUser, newGroup };
