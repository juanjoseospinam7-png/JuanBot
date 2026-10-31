import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePermissions } from '../handlers/permissions.js';

const command = (overrides = {}) => ({
    permission: 'user',
    groupOnly: false,
    botAdminRequired: false,
    ...overrides
});

test('los comandos de usuario funcionan en privado', () => {
    assert.equal(evaluatePermissions({
        command: command(),
        isGroup: false,
        isOwner: false,
        isGroupAdmin: false,
        isBotAdmin: false
    }).allowed, true);
});

test('groupOnly bloquea chats privados', () => {
    const result = evaluatePermissions({
        command: command({ groupOnly: true }),
        isGroup: false,
        isOwner: true,
        isGroupAdmin: false,
        isBotAdmin: false
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'group_only');
});

test('owner_only bloquea a no propietarios', () => {
    const result = evaluatePermissions({
        command: command({ permission: 'owner' }),
        isGroup: true,
        isOwner: false,
        isGroupAdmin: true,
        isBotAdmin: true
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'owner_only');
});

test('admin requiere grupo y rango', () => {
    assert.equal(evaluatePermissions({
        command: command({ permission: 'admin' }),
        isGroup: false,
        isOwner: false,
        isGroupAdmin: false,
        isBotAdmin: false
    }).reason, 'admin_group_only');

    assert.equal(evaluatePermissions({
        command: command({ permission: 'admin' }),
        isGroup: true,
        isOwner: false,
        isGroupAdmin: false,
        isBotAdmin: true
    }).reason, 'admin_only');

    assert.equal(evaluatePermissions({
        command: command({ permission: 'admin' }),
        isGroup: true,
        isOwner: false,
        isGroupAdmin: true,
        isBotAdmin: true
    }).allowed, true);
});

test('el propietario puede usar admin sin ser admin del grupo', () => {
    assert.equal(evaluatePermissions({
        command: command({ permission: 'admin' }),
        isGroup: true,
        isOwner: true,
        isGroupAdmin: false,
        isBotAdmin: false
    }).allowed, true);
});

test('botAdminRequired bloquea si el bot no es admin', () => {
    const result = evaluatePermissions({
        command: command({ permission: 'admin', groupOnly: true, botAdminRequired: true }),
        isGroup: true,
        isOwner: true,
        isGroupAdmin: true,
        isBotAdmin: false
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'bot_not_admin');
});
