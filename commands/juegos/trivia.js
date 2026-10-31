import config from '../../config.js';
import { formatNumber, success, warning } from '../../lib/format.js';
import { addCoins, addXp } from '../../lib/economy.js';

const QUESTIONS = [
    { question: '¿Cuál es el planeta más grande del sistema solar?', answers: ['jupiter'] },
    { question: '¿Cuál es el océano más grande del mundo?', answers: ['pacifico'] },
    { question: '¿Qué lenguaje se usa principalmente en Node.js?', answers: ['javascript', 'js'] },
    { question: '¿Cuántos jugadores tiene un equipo de fútbol en el campo?', answers: ['11', 'once'] },
    { question: '¿Qué metal es líquido a temperatura ambiente?', answers: ['mercurio'] },
    { question: '¿Qué país ganó el Mundial de Fútbol 2022?', answers: ['argentina'] },
    { question: '¿Cuál es la capital de Colombia?', answers: ['bogota'] },
    { question: '¿Cuántos días tiene un año bisiesto?', answers: ['366'] },
    { question: '¿Cuál es el animal terrestre más rápido?', answers: ['guepardo', 'chita'] },
    { question: '¿Cuántas patas tiene una araña?', answers: ['8', 'ocho'] },
    { question: '¿Cuántos lados tiene un hexágono?', answers: ['6', 'seis'] },
    { question: '¿Qué planeta es conocido como el planeta rojo?', answers: ['marte'] },
    { question: '¿Cuál es el símbolo químico del oro?', answers: ['au'] },
    { question: '¿Cuántos minutos tiene una hora?', answers: ['60', 'sesenta'] },
    { question: '¿Qué gas necesitan los humanos para respirar?', answers: ['oxigeno'] }
];

const states = new Map();
const REWARD_COINS = 120;
const REWARD_XP = 20;
const TIMEOUT_MS = 60_000;

const normalize = (value) => String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const matches = (text, question) => {
    const answer = normalize(text);
    if (!answer) return false;
    return question.answers.some((option) => {
        const target = normalize(option);
        return answer === target || (target.length >= 4 && answer.includes(target));
    });
};

const clearState = (chatId) => {
    const state = states.get(chatId);
    if (state?.timer) clearTimeout(state.timer);
    states.delete(chatId);
};

export default {
    name: 'trivia',
    aliases: ['quiz'],
    description: 'Responde una trivia y gana monedas',
    usage: `${config.prefix}trivia`,
    category: 'juegos',
    emoji: '🧠',
    cooldown: 8_000,
    async execute(ctx) {
        clearState(ctx.chatId);
        const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const state = { question, timer: null, startedAt: Date.now() };

        state.timer = setTimeout(async () => {
            if (states.get(ctx.chatId) !== state) return;
            states.delete(ctx.chatId);
            await ctx.reply(warning([
                '⏰ Se acabó el tiempo.',
                `✅ *Respuesta:* ${question.answers[0]}`
            ].join('\n'))).catch((error) => ctx.logger.warn('[TRIVIA]', error.message));
        }, TIMEOUT_MS);
        state.timer.unref?.();
        states.set(ctx.chatId, state);

        await ctx.reply([
            '🧠 *TRIVIA*',
            '',
            question.question,
            '',
            `💰 Recompensa: *${formatNumber(REWARD_COINS)}* monedas · *${REWARD_XP}* XP`,
            `⏰ Tienes *${TIMEOUT_MS / 1000} segundos*.`
        ].join('\n'));
    },

    async onMessage(ctx) {
        const state = states.get(ctx.chatId);
        if (!state) return false;
        if (!matches(ctx.text, state.question)) return false;

        clearState(ctx.chatId);
        const user = ctx.db.getUser(ctx.senderId);
        addCoins(user, REWARD_COINS);
        const result = addXp(user, REWARD_XP);
        ctx.db.touchUser(ctx.senderId);

        await ctx.reply(success([
            `✅ ¡Correcto! La respuesta era *${state.question.answers[0]}*.`,
            `🪙 *Monedas:* +${formatNumber(REWARD_COINS)}`,
            `✨ *XP:* +${REWARD_XP}`,
            result.leveledUp ? `🎉 ¡Subiste al nivel *${result.level}*!` : null
        ].filter(Boolean).join('\n')));
        return true;
    }
};
