import test from 'node:test';
import assert from 'node:assert/strict';
import { __test__ } from '../lib/media.js';

test('ensureStickerSize rechaza stickers mayores a 1 MB', () => {
    assert.throws(() => __test__.ensureStickerSize(Buffer.alloc(1024 * 1024 + 1)), /1 MB/);
});

test('ensureStickerSize rechaza buffers vacíos', () => {
    assert.throws(() => __test__.ensureStickerSize(Buffer.alloc(0)), /vacío/);
});

test('ensureStickerSize acepta buffers válidos', () => {
    const buffer = Buffer.from('RIFF....WEBP');
    assert.equal(__test__.ensureStickerSize(buffer), buffer);
});
