import { onlyDigits } from '../../lib/jid.js';
import { formatDuration, warning } from '../../lib/format.js';
import { remainingCooldown } from '../../lib/economy.js';
import { resolveGroupTarget } from '../../lib/targets.js';
import { mentionFor } from '../grupos/_helpers.js';

export const resolveProfileTarget = (ctx) => {
    if (!ctx.args[0] && !ctx.quoted?.key) {
        return { jid: ctx.senderId, mention: [], label: `@${ctx.identity.phone}` };
    }

    if (ctx.isGroup) {
        const target = resolveGroupTarget(ctx);
        if (!target) return null;
        const phoneJid = target.participant?.phoneNumber
            ? `${onlyDigits(target.participant.phoneNumber)}@s.whatsapp.net`
            : null;
        const raw = phoneJid || target.participant?.id || target.jid;
        return {
            jid: ctx.db.canonicalJid(raw) || raw,
            mention: [mentionFor(target)],
            label: `@${target.phone || onlyDigits(target.jid)}`
        };
    }

    const digits = onlyDigits(ctx.args[0]);
    if (digits.length < 8) return null;
    return {
        jid: `${digits}@s.whatsapp.net`,
        mention: [],
        label: `@${digits}`
    };
};

export const checkRpgCooldown = async (ctx, user, field, ms, label) => {
    const remaining = remainingCooldown(user, field, ms);
    if (remaining <= 0) return true;
    await ctx.reply(warning(`⏳ Debes esperar *${formatDuration(remaining)}* para volver a usar *${label}*.`));
    return false;
};
