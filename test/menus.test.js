import test from 'node:test';
import assert from 'node:assert/strict';
import {
    commandCount,
    getCategory,
    renderCategoryMenu,
    renderCommandHelp,
    renderMainMenu
} from '../lib/menus.js';

const ping = {
    name: 'ping',
    aliases: ['pong'],
    description: 'Latencia',
    usage: '..ping',
    category: 'info',
    emoji: '🏓',
    permission: 'user',
    cooldown: 1_000,
    hidden: false
};
const owner = {
    name: 'stats',
    aliases: [],
    description: 'Estadísticas',
    usage: '..stats',
    category: 'owner',
    emoji: '📈',
    permission: 'owner',
    cooldown: 1_000,
    hidden: false
};

const registry = new Map([
    ['ping', ping],
    ['pong', ping],
    ['stats', owner]
]);

test('el menú principal no duplica alias ni muestra owner a usuarios', () => {
    const text = renderMainMenu({ commands: registry, prefix: '..', botName: 'JUAN-BOT', role: 'user' });
    assert.equal((text.match(/\.\.ping/g) ?? []).length, 1);
    assert.doesNotMatch(text, /\.\.stats/);
    assert.match(text, /JUAN-BOT/);
});

test('el menú owner sí incluye comandos de propietario', () => {
    const text = renderMainMenu({ commands: registry, prefix: '..', botName: 'JUAN-BOT', role: 'owner' });
    assert.match(text, /\.\.stats/);
});

test('renderCategoryMenu y help generan texto útil', () => {
    const category = getCategory('info');
    assert.equal(category.key, 'info');
    const menu = renderCategoryMenu({ commands: registry, category, prefix: '..', botName: 'JUAN-BOT', role: 'user' });
    assert.match(menu, /\.\.ping/);

    const help = renderCommandHelp({ command: ping, prefix: '..', commands: registry });
    assert.match(help, /\.\.ping/);
    assert.match(help, /\.\.pong/);
    assert.match(help, /1s/);
});

test('commandCount cuenta comandos únicos', () => {
    assert.equal(commandCount(registry), 2);
    assert.equal(getCategory('inexistente'), null);
});
