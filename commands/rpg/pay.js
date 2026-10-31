import config from '../../config.js';
import { formatNumber, success, warning } from '../../lib/format.js';
import { addCoins, parseAmount } from '../../lib/economy.js';
import { findParticipant } from '../../lib/jid.js';
import { resolveGroupTarget } from '../../lib/targets.js';
import { mentionFor } from '../grupos/_helpers.js';

export default {
    name: 'pay',
    aliases: ['pagar', 'transferir'],
    description: 'Transfiere monedas a otro miembro',
    usage: `${config.prefix}pay @usuario <cantidad>`,
    category: 'rpg',
    emoji: '💸',
    permission: 'user',
    groupOnly: true,
    cooldown: 5_000,
    async execute(ctx) {
        const target = resolveGroupTarget(ctx);
        if (!target?.participant) {
            await ctx.reply(warning(`Menciona a un miembro o responde a su mensaje.\n\n*Uso:* ${config.prefix}pay @usuario 500`));
            return;
        }
        if (findParticipant({ participants: [target.participant] }, ctx.identity)) {
            await ctx.reply(warning('No puedes transferirte monedas a ti mismo.'));
            return;
        }

        const amountRaw = parseAmount(ctx.args[1])
            ? ctx.args[1]
            : ((ctx.quoted?.key || String(ctx.args[0] ?? '').startsWith('@')) ? ctx.args[0] : null);
        const amount = parseAmount(amountRaw);
        if (!amount) {
            await ctx.reply(warning(`Indica una cantidad válida. Ejemplo: *${config.prefix}pay @usuario 500*`));
            return;
        }

        const sender = ctx.db.getUser(ctx.senderId);
        if (sender.coins < amount) {
            await ctx.reply(warning(`No tienes suficientes monedas.\n💰 *Saldo:* ${formatNumber(sender.coins)}`));
            return;
        }

        const phoneJid = target.participant.phoneNumber
            ? `${String(target.participant.phoneNumber).replace(/\D/g, '')}@s.whatsapp.net`
            : null;
        const receiverJid = ctx.db.canonicalJid(phoneJid || target.participant.id) || target.jid;
        const receiver = ctx.db.getUser(receiverJid);

        addCoins(sender, -amount);
        addCoins(receiver, amount);
        ctx.db.touchUser(ctx.senderId);
        ctx.db.touchUser(receiverJid);

        await ctx.reply(success([
            `💸 Transferencia completada.`,
            `📤 *Enviaste:* ${formatNumber(amount)} monedas`,
            `📥 *Destinatario:* @${target.phone || target.participant.id.split('@')[0]}`,
            `💰 *Tu saldo:* ${formatNumber(sender.coins)}`
        ].join('\n')), { mentions: [mentionFor(target)] });
    }
};
