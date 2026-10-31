import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import config from '../config.js';

const logsDir = path.join(config.rootDir, 'logs');
const logFile = path.join(logsDir, 'juan-bot.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024;

fs.mkdirSync(logsDir, { recursive: true });

if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_BYTES) {
    const rotated = path.join(logsDir, `juan-bot-${Date.now()}.log`);
    try {
        fs.renameSync(logFile, rotated);
    } catch {
        // Si no se puede rotar, se sigue escribiendo en el archivo actual.
    }
}

const stream = fs.createWriteStream(logFile, { flags: 'a' });

const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = levels[config.logLevel] ?? levels.info;

const serialize = (args) => args.map((arg) => {
    if (arg instanceof Error) return arg.stack || arg.message;
    if (typeof arg === 'object') {
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }
    return String(arg);
}).join(' ');

const write = (level, args) => {
    if (levels[level] < configuredLevel) return;
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${serialize(args)}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    stream.write(`${line}\n`);
};

export const logger = {
    debug: (...args) => write('debug', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
    child: () => logger
};

export const baileysLogger = pino({ level: config.logLevel === 'debug' ? 'debug' : 'silent' });

export const closeLogger = () => new Promise((resolve) => stream.end(resolve));
