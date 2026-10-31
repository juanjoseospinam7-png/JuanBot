import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { __test__ } from '../handlers/database.js';

const { JsonStore, mergeDefaults } = __test__;

test('JsonStore guarda y recupera datos con escritura atómica', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'juan-db-'));
    const file = path.join(dir, 'users.json');
    const backups = path.join(dir, 'backups');
    try {
        const store = new JsonStore('users', file, { users: {} }, backups);
        await store.init();
        store.data.users['573001112233@s.whatsapp.net'] = { coins: 10 };
        await store.saveNow();

        const saved = JSON.parse(await fs.readFile(file, 'utf8'));
        assert.equal(saved.users['573001112233@s.whatsapp.net'].coins, 10);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('JsonStore recupera un archivo corrupto sin romper el proceso', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'juan-db-corrupt-'));
    const file = path.join(dir, 'users.json');
    const backups = path.join(dir, 'backups');
    try {
        const first = new JsonStore('users', file, { users: {} }, backups);
        await first.init();
        await first.saveNow();
        await fs.writeFile(file, '{esto no es json', 'utf8');

        const second = new JsonStore('users', file, { users: {} }, backups);
        await second.init();
        assert.equal(typeof second.data.users, 'object');

        const files = await fs.readdir(dir);
        assert.ok(files.some((name) => name.includes('.corrupt-')), 'el archivo corrupto debe conservarse');
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('mergeDefaults agrega claves faltantes sin sobrescribir', () => {
    const target = { users: { a: { coins: 5 } }, version: 2 };
    const defaults = { users: {}, version: 1, groups: {} };
    mergeDefaults(target, defaults);
    assert.equal(target.version, 2);
    assert.deepEqual(target.groups, {});
    assert.equal(target.users.a.coins, 5);
});
