import test from 'node:test';
import assert from 'node:assert/strict';
import {
    findParticipant,
    isAdminParticipant,
    isLidJid,
    isOwnerIdentity,
    isPnJid,
    normalizeJid,
    participantMatches,
    resolveIdentity
} from '../lib/jid.js';

test('normalizeJid limpia dispositivo y dominio c.us', () => {
    assert.equal(normalizeJid('573001112233:12@s.whatsapp.net'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeJid('573001112233@c.us'), '573001112233@s.whatsapp.net');
    assert.equal(normalizeJid('  ABC@LID '), 'abc@lid');
    assert.equal(normalizeJid(null), '');
});

test('resolveIdentity reconoce PN y LID alternos', () => {
    const identity = resolveIdentity({
        remoteJid: '120363000000000000@g.us',
        participant: '111111111111111@lid',
        participantAlt: '573001112233@s.whatsapp.net'
    });
    assert.equal(identity.lid, '111111111111111@lid');
    assert.equal(identity.pn, '573001112233@s.whatsapp.net');
    assert.equal(identity.phone, '573001112233');
    assert.ok(isLidJid(identity.lid));
    assert.ok(isPnJid(identity.pn));
});

test('participantMatches compara LID y número de teléfono', () => {
    const participant = { id: '111111111111111@lid', phoneNumber: '573001112233' };
    const identity = resolveIdentity({ participant: '573001112233@s.whatsapp.net' });
    assert.equal(participantMatches(participant, identity), true);
    assert.equal(participantMatches({ id: '999999999999@lid' }, identity), false);
    assert.ok(findParticipant({ participants: [participant] }, identity));
});

test('un propietario vacío nunca concede permisos', () => {
    const identity = resolveIdentity({ participant: '573001112233@s.whatsapp.net' });
    assert.equal(isOwnerIdentity(identity, { ownerNumber: null, ownerJid: null, ownerLid: null }), false);
    assert.equal(isOwnerIdentity(identity, { ownerNumber: '573001112233' }), true);
    assert.equal(isOwnerIdentity(identity, { ownerNumber: '573000000000' }), false);
});

test('isAdminParticipant soporta ambos formatos de Baileys', () => {
    assert.equal(isAdminParticipant({ admin: 'admin' }), true);
    assert.equal(isAdminParticipant({ isSuperAdmin: true }), true);
    assert.equal(isAdminParticipant({ admin: null }), false);
    assert.equal(isAdminParticipant(null), false);
});
