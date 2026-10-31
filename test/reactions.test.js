import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLAYERS, normalizeEmoji, renderListText } from '../handlers/reactions.js';

test('normalizeEmoji quita el selector de variación', () => {
    assert.equal(normalizeEmoji('❤️'), '❤');
    assert.equal(normalizeEmoji('👍'), '👍');
    assert.equal(normalizeEmoji(undefined), '');
});

test('renderListText muestra código, cupos y jugadores', () => {
    const text = renderListText({
        code: 'ABC123',
        updatedAt: Date.now(),
        participants: [
            { jid: '573001112233@s.whatsapp.net', phone: '573001112233', emoji: '❤' },
            { jid: '573004445566@s.whatsapp.net', phone: '573004445566', emoji: '🔥' }
        ]
    });
    assert.match(text, /ABC123/);
    assert.match(text, new RegExp(`2/${MAX_PLAYERS}`));
    assert.match(text, /573001112233/);
    assert.match(text, /573004445566/);
    assert.match(text, /Reacciona/);
});
