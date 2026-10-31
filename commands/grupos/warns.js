import config from '../../config.js';
import { box, warning } from '../../lib/format.js';
import { findParticipant, onlyDigits } from '../../lib/jid.js';
import { mentionFor, requireTarget } from './_helpers.js';

const entryFor = (group, phone, jid) => {
    const keys = [phone, onlyDigits(jid), jid].filter(Boolean);
    for (const key of keys) {
        if (group.warns[key]) return { key, entry: group.warns[key] };
    }
    return null;
};

const renderEntry = (label, entry) => box('ADVERTENCIAS', [
    `│ 👤 *Miembro:* ${label}`,
    `│ ⚠️ *Total:* ${entry?.count ?? 0}/${config.warningsBeforeKick}`,
    '│ 📝 *Motivos:*',
    ...(entry?.reasons?.length
        ? entry.reasons.map((reason) => `│   • ${reason}`)
        : ['│   • Sin motivos registrados'])
], '⚠️');

export default {
    name: 'warns',
    aliases: ['advertencias'],
    description: 'Consulta las advertencias de un miembro o del grupo',
    usage: `${config.prefix}warns [@usuario]`,
    category: 'grupos',
    emoji: '📋',
    permission: 'user',
    groupOnly: true,
    cooldown: 3_000,
    async execute(ctx) {
        const group = ctx.db.getGroup(ctx.chatId);
        const hasTarget = Boolean(ctx.args[0] || ctx.quoted?.key);

        if (!hasTarget) {
            if (ctx.isGroupAdmin || ctx.isOwner) {
                const entries = Object.entries(group.warns ?? {})
                    .filter(([, entry]) => entry?.count > 0)
                    .sort((a, b) => b[1].count - a[1].count);
                if (!entries.length) {
                    await ctx.reply('✅ Este grupo no tiene advertencias registradas.');
                    return;
                }
                const lines = entries.slice(0, 20).map(([key, entry]) => (
                    `│ ⚠️ *${key.split('@')[0]}* — ${entry.count}/${config.warningsBeforeKick} — ${entry.reasons?.at(-1) || 'Sin motivo'}`
                ));
                await ctx.reply(box('ADVERTENCIAS DEL GRUPO', lines, '📋'));
                return;
            }

            const own = entryFor(group, ctx.identity.phone, ctx.senderJid);
            await ctx.reply(renderEntry(`@${ctx.identity.phone || onlyDigits(ctx.senderJid)}`, own?.entry));
            return;
        }

        const target = await requireTarget(ctx, `${config.prefix}warns @usuario`);
        if (!target?.participant) {
            if (target) await ctx.reply(warning('Ese número no está en el grupo o no pude identificarlo.'));
            return;
        }

        const isSelf = Boolean(findParticipant({ participants: [target.participant] }, ctx.identity));
        if (!isSelf && !ctx.isGroupAdmin && !ctx.isOwner) {
            await ctx.reply(warning('Solo los administradores pueden consultar las advertencias de otros miembros.'));
            return;
        }

        const found = entryFor(group, target.phone, target.participant.id);
        const label = `@${target.phone || onlyDigits(target.jid)}`;
        await ctx.reply(renderEntry(label, found?.entry), { mentions: [mentionFor(target)] });
    }
};
