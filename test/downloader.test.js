import test from 'node:test';
import assert from 'node:assert/strict';
import { __test__, safeFileName } from '../lib/downloader.js';

test('isUrl acepta solo http y https', () => {
    assert.equal(__test__.isUrl('https://youtube.com/watch?v=abc'), true);
    assert.equal(__test__.isUrl('http://example.com'), true);
    assert.equal(__test__.isUrl('youtube.com'), false);
    assert.equal(__test__.isUrl('ftp://example.com'), false);
    assert.equal(__test__.isUrl(''), false);
});

test('safeFileName limpia caracteres peligrosos', () => {
    const name = safeFileName('Canción: ñandú / 100%', 'mp3');
    assert.match(name, /\.mp3$/);
    assert.doesNotMatch(name, /[/\\:]/);
    assert.ok(name.length <= 64);
});
