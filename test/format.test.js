import test from 'node:test';
import assert from 'node:assert/strict';
import { box, formatDuration, formatNumber, progressBar, truncate } from '../lib/format.js';

test('formatDuration descompone días, horas, minutos y segundos', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(61_000), '1m 1s');
    assert.equal(formatDuration(3_661_000), '1h 1m 1s');
    assert.equal(formatDuration(90_061_000), '1d 1h 1m 1s');
});

test('progressBar respeta límites', () => {
    assert.match(progressBar(50, 100, 10), /50%/);
    assert.match(progressBar(-5, 100, 10), /0%/);
    assert.match(progressBar(500, 100, 10), /100%/);
});

test('formatNumber y truncate son seguros', () => {
    assert.equal(typeof formatNumber(1_000), 'string');
    assert.equal(truncate('abcdef', 4), 'abc…');
    assert.equal(truncate('abc', 10), 'abc');
});

test('box conserva el título y las líneas', () => {
    const rendered = box('PRUEBA', ['uno', 'dos'], '🧪');
    assert.match(rendered, /PRUEBA/);
    assert.match(rendered, /uno/);
    assert.match(rendered, /dos/);
});
