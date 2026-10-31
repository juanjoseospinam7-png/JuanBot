import config from '../../config.js';
import { success, warning } from '../../lib/format.js';
import { onlyDigits } from '../../lib/jid.js';
import { invalidateGroupCache } from '../../handlers/permissions.js';
import { mentionFor, protectTarget, requireTarget } from './_helpers.js';

export default {
    name: 'warn',
    aliases: ['advertir', 'strike'],
    description: 'Agrega una advertencia a un miembro',
    usage: `${config.prefix}warn @usuario [motivo]`,
    category: 'grupos',
    emoji: '⚠️',
    permission: 'admin',
    groupOnly: true,
    cooldown: 3_000,
    async execute(ctx) {
        const target = await requireTarget(ctx, `${config.prefix}warn @usuario [motivo]`);
        if (!target?.participant) {
            if (target) await ctx.reply(warning('Ese número no está en el grupo o no pude identificarlo.'));
            return;
        }
        if (!await protectTarget(ctx, target)) return;

        const group = ctx.db.getGroup(ctx.chatId);
        const key = target.phone || onlyDigits(target.participant.id) || target.jid;
        const reason = ctx.args.slice(1).join(' ').trim() || 'Sin motivo especificado';
        const entry = group.warns[key] ?? { count: 0, reasons: [], updatedAt: 0 };
        entry.count += 1;
        entry.reasons = [...(entry.reasons ?? []), reason].slice(-5);
        entry.updatedAt = Date.now();
        group.warns[key] = entry;
        ctx.db.touchGroup(ctx.chatId);

        const label = `@${target.phone || onlyDigits(target.jid)}`;
        if (entry.count >= config.warningsBeforeKick) {
            if (!ctx.isBotAdmin) {
                await ctx.reply(warning([
                    `${label} alcanzó *${entry.count}/${config.warningsBeforeKick}* advertencias.`,
                    'No puedo expulsarlo porque no soy administrador del grupo.'
                ].join('\n')), { mentions: [mentionFor(target)] });
                return;
            }
            try {
                await ctx.sock.groupParticipantsUpdate(ctx.chatId, [target.participant.id], 'remove');
                delete group.warns[key];
                ctx.db.touchGroup(ctx.chatId);
                invalidateGroupCache(ctx.chatId);
                await ctx.reply(success([
                    `${label} fue expulsado por acumular *${config.warningsBeforeKick}* advertencias.`,
                    `📝 Último motivo: ${reason}`
                ].join('\n')), { mentions: [mentionFor(target)] });
            } catch (error) {
                ctx.logger.error('[WARN]', error);
                await ctx.reply(warning('Alcanzó el límite de advertencias, pero no pude expulsarlo. Revisa mis permisos.'));
            }
            return;
        }

        await ctx.reply(warning([
            `${label} recibió una advertencia.`,
            `⚠️ Total: *${entry.count}/${config.warningsBeforeKick}*`,
            `📝 Motivo: ${reason}`,
            entry.count === config.warningsBeforeKick - 1 ? '🚨 La próxima advertencia provoca la expulsión.' : null
        ].filter(Boolean).join('\n')), { mentions: [mentionFor(target)] });
    }
};
