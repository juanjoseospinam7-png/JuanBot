import test from 'node:test';
import assert from 'node:assert/strict';
import {
    addCoins,
    addXp,
    levelForXp,
    parseAmount,
    rankOf,
    remainingCooldown,
    xpForLevel,
    xpForNextLevel
} from '../lib/economy.js';

test('fórmulas de nivel y XP son consistentes', () => {
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(100), 2);
    assert.equal(levelForXp(399), 2);
    assert.equal(levelForXp(400), 3);
    assert.equal(xpForLevel(3), 400);
    assert.equal(xpForNextLevel(2), 400);
});

test('addXp sube de nivel y addCoins no permite saldo negativo', () => {
    const user = { xp: 0, level: 1, coins: 100 };
    const result = addXp(user, 150);
    assert.equal(user.xp, 150);
    assert.equal(result.leveledUp, true);
    assert.equal(user.level, 2);
    assert.equal(addCoins(user, -30), 70);
    assert.equal(addCoins(user, -500), 0);
});

test('parseAmount acepta enteros y sufijos k/m', () => {
    assert.equal(parseAmount('500'), 500);
    assert.equal(parseAmount('2k'), 2_000);
    assert.equal(parseAmount('1m'), 1_000_000);
    assert.equal(parseAmount('0'), null);
    assert.equal(parseAmount('abc'), null);
    assert.equal(parseAmount('-5'), null);
});

test('cooldown y ranking funcionan', () => {
    const user = { lastWork: Date.now() };
    assert.ok(remainingCooldown(user, 'lastWork', 60_000) > 0);
    assert.equal(remainingCooldown({ lastWork: Date.now() - 1_000 }, 'lastWork', 10), 0);

    const users = {
        a: { jid: 'a@s.whatsapp.net', coins: 10 },
        b: { jid: 'b@s.whatsapp.net', coins: 90 },
        c: { jid: 'c@s.whatsapp.net', coins: 40 }
    };
    assert.equal(rankOf(users, 'b@s.whatsapp.net'), 1);
    assert.equal(rankOf(users, 'a@s.whatsapp.net'), 3);
    assert.equal(rankOf(users, 'z@s.whatsapp.net'), null);
});
