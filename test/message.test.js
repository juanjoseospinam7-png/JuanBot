import test from 'node:test';
import assert from 'node:assert/strict';
import {
    extractText,
    getMentionedJids,
    getQuotedMessage,
    hasLink,
    parseCommand,
    tokenize
} from '../lib/message.js';

const wrap = (content) => ({ key: { remoteJid: '573001112233@s.whatsapp.net' }, message: content });

test('extractText lee conversación y texto extendido', () => {
    assert.equal(extractText(wrap({ conversation: 'hola' })), 'hola');
    assert.equal(extractText(wrap({ extendedTextMessage: { text: 'mundo' } })), 'mundo');
    assert.equal(extractText(wrap({ imageMessage: { caption: 'foto' } })), 'foto');
    assert.equal(extractText(wrap({ stickerMessage: {} })), '');
});

test('parseCommand exige el prefijo exacto', () => {
    assert.deepEqual(parseCommand('..play una cancion', '..'), {
        name: 'play',
        rawArgs: 'una cancion',
        args: ['una', 'cancion']
    });
    assert.equal(parseCommand('.play x', '..'), null);
    assert.equal(parseCommand('..', '..'), null);
    assert.equal(parseCommand('texto', '..'), null);
    assert.equal(parseCommand('..MENU', '..').name, 'menu');
});

test('tokenize respeta comillas', () => {
    assert.deepEqual(tokenize('play "mi canción" favorita'), ['play', 'mi canción', 'favorita']);
    assert.deepEqual(tokenize("yt 'video corto'"), ['yt', 'video corto']);
});

test('hasLink detecta enlaces comunes', () => {
    assert.equal(hasLink('mira https://example.com'), true);
    assert.equal(hasLink('wa.me/573001112233'), true);
    assert.equal(hasLink('hola mundo'), false);
});

test('extrae menciones y mensaje citado', () => {
    const message = wrap({
        extendedTextMessage: {
            text: '..kick @123',
            contextInfo: {
                mentionedJid: ['123@s.whatsapp.net'],
                participant: '456@s.whatsapp.net',
                stanzaId: 'ABC',
                quotedMessage: { conversation: 'hola' }
            }
        }
    });
    assert.deepEqual(getMentionedJids(message), ['123@s.whatsapp.net']);
    const quoted = getQuotedMessage(message);
    assert.equal(quoted.key.id, 'ABC');
    assert.equal(quoted.key.participant, '456@s.whatsapp.net');
    assert.equal(extractText(quoted), 'hola');
});
