import config from '../../config.js';
import { warning } from '../../lib/format.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
    name: 'todos',
    aliases: ['tagall', 'mencionar'],
    description: 'Menciona a todos los miembros del grupo',
    usage: `${config.prefix}todos [mensaje]`,
    category: 'grupos',
    emoji: '📢',
    permission: 'admin',
    groupOnly: true,
    botAdminRequired: true,
    cooldown: 10_000,
    async execute(ctx) {
        const metadata = ctx.groupMetadata ?? await ctx.getMetadata();
        const participants = (metadata?.participants ?? [])
            .map((participant) => participant.id)
            .filter(Boolean);

        if (!participants.length) {
            await ctx.reply(warning('No pude obtener la lista de miembros del grupo.'));
            return;
        }

        const note = ctx.rawArgs.trim() || 'Atención general';
        const chunkSize = 45;
        for (let index = 0; index < participants.length; index += chunkSize) {
            const chunk = participants.slice(index, index + chunkSize);
            const part = index === 0 ? 1 : Math.floor(index / chunkSize) + 1;
            await ctx.send([
                '📢 *MENCIÓN GENERAL*',
                '',
                `📝 ${note}`,
                '',
                chunk.map((jid) => `@${jid.split('@')[0]}`).join(' '),
                '',
                `👥 Miembros: ${participants.length}${part > 1 ? ` · Parte ${part}` : ''}`
            ].join('\n'), { mentions: chunk });
            if (index + chunkSize < participants.length) await sleep(800);
        }
    }
};
