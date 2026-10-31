import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTargetIdentity, resolveGroupTarget } from '../lib/targets.js';

const context = (contextInfo = {}) => ({
    msg: {
        key: { remoteJid: '120363000000000000@g.us' },
        message: { extendedTextMessage: { text: '..kick', contextInfo } }
    },
    args: []
});

test('buildTargetIdentity prioriza la mención', () => {
    const identity = buildTargetIdentity(context({ mentionedJid: ['573001112233@s.whatsapp.net'] }));
    assert.equal(identity.jid, '573001112233@s.whatsapp.net');
    assert.equal(identity.phone, '573001112233');
});

test('buildTargetIdentity acepta número escrito sin @', () => {
    const ctx = context();
    ctx.args = ['573001112233'];
    const identity = buildTargetIdentity(ctx);
    assert.equal(identity.jid, '573001112233@s.whatsapp.net');
});

test('resolveGroupTarget encuentra al participante por PN aunque el ID sea LID', () => {
    const ctx = context({ mentionedJid: ['573001112233@s.whatsapp.net'] });
    ctx.groupMetadata = {
        participants: [{
            id: '111111111111111@lid',
            phoneNumber: '573001112233',
            admin: null
        }]
    };
    const target = resolveGroupTarget(ctx);
    assert.equal(target.participant.id, '111111111111111@lid');
    assert.equal(target.jid, '111111111111111@lid');
    assert.equal(target.phone, '573001112233');
});

test('resolveGroupTarget devuelve null sin objetivo', () => {
    assert.equal(resolveGroupTarget(context()), null);
});
