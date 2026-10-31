import config from '../../config.js';
import { error, success, warning } from '../../lib/format.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
    name: 'broadcast',
    aliases: ['bc', 'difundir'],
    description: 'Envía un mensaje a todos los grupos',
    usage: `${config.prefix}broadcast <mensaje>`,
    category: 'owner',
    emoji: '📣',
    permission: 'owner',
    cooldown: 60_000,
    async execute(ctx) {
        const message = ctx.rawArgs.trim();
        if (!message) {
            await ctx.reply(warning(`Escribe el mensaje a difundir.\n\n*Uso:* ${config.prefix}broadcast Hola a todos`));
            return;
        }

        try {
            const groups = await ctx.sock.groupFetchAllParticipating();
            const ids = Object.keys(groups ?? {});
            if (!ids.length) {
                await ctx.reply(warning('No estoy participando en ningún grupo.'));
                return;
            }

            const text = [
                '📣 *COMUNICADO OFICIAL*',
                '',
                message,
                '',
                `— ${config.botName}`
            ].join('\n');

            let sent = 0;
            let failed = 0;
            for (const jid of ids) {
                try {
                    await ctx.sock.sendMessage(jid, { text });
                    sent += 1;
                } catch (err) {
                    failed += 1;
                    ctx.logger.warn(`[BROADCAST] Falló en ${jid}:`, err.message);
                }
                await sleep(700);
            }

            await ctx.reply(success([
                '📣 Difusión completada.',
                `✅ Enviados: *${sent}*`,
                `❌ Fallidos: *${failed}*`
            ].join('\n')));
        } catch (err) {
            ctx.logger.error('[BROADCAST]', err);
            await ctx.reply(error(`No se pudo completar la difusión: ${err.message}`));
        }
    }
};
