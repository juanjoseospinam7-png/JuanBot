import { formatNumber, progressBar } from './format.js';

export const levelForXp = (xp) => Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1;
export const xpForLevel = (level) => Math.max(0, level - 1) ** 2 * 100;
export const xpForNextLevel = (level) => Math.max(1, level) ** 2 * 100;

export const syncLevel = (user) => {
    const level = levelForXp(user.xp);
    const leveledUp = level > (user.level || 1);
    user.level = level;
    return leveledUp;
};

export const addXp = (user, amount) => {
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    user.xp = Math.max(0, (Number(user.xp) || 0) + gained);
    const leveledUp = syncLevel(user);
    return { gained, leveledUp, level: user.level };
};

export const addCoins = (user, amount) => {
    const delta = Math.trunc(Number(amount) || 0);
    user.coins = Math.max(0, (Number(user.coins) || 0) + delta);
    return user.coins;
};

export const remainingCooldown = (user, field, cooldownMs) => {
    const last = Number(user?.[field]) || 0;
    const remaining = last + cooldownMs - Date.now();
    return remaining > 0 ? remaining : 0;
};

export const parseAmount = (input) => {
    const raw = String(input ?? '').trim().toLowerCase().replace(/[.,\s]/g, '');
    if (!raw) return null;
    const match = raw.match(/^(\d+(?:[km])?)$/);
    if (!match) return null;
    const suffix = match[1].slice(-1);
    const base = Number(suffix === 'k' || suffix === 'm' ? match[1].slice(0, -1) : match[1]);
    if (!Number.isFinite(base)) return null;
    const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1;
    const value = Math.floor(base * multiplier);
    return value > 0 ? value : null;
};

export const rankOf = (users, jid) => {
    const sorted = Object.values(users)
        .sort((a, b) => (Number(b.coins) || 0) - (Number(a.coins) || 0));
    const index = sorted.findIndex((user) => user.jid === jid);
    return index === -1 ? null : index + 1;
};

export const formatProfile = (user, title = 'PERFIL') => {
    const level = user.level || levelForXp(user.xp);
    const currentBase = xpForLevel(level);
    const next = xpForNextLevel(level);
    const current = Math.max(0, (Number(user.xp) || 0) - currentBase);
    const needed = Math.max(1, next - currentBase);
    return [
        `╭─「 💼 *${title}* 」`,
        `│ 👤 *Usuario:* ${String(user.jid).split('@')[0]}`,
        `│ ⭐ *Nivel:* ${level}`,
        `│ 📊 *XP:* ${formatNumber(user.xp)} (${progressBar(current, needed, 8)})`,
        `│ 🪙 *Monedas:* ${formatNumber(user.coins)}`,
        `│ ⚠️ *Advertencias:* ${Number(user.warns) || 0}`,
        '╰──────────────────────────╯'
    ].join('\n');
};
