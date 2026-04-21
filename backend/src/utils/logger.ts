type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const levelRank: Record<LogLevel, number> = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
};

const configuredLevel = String(process.env.LOG_LEVEL || '').trim().toUpperCase() as LogLevel | '';
const defaultLevel: LogLevel = String(process.env.NODE_ENV || '').toLowerCase() === 'production' ? 'INFO' : 'WARN';
const activeLevel: LogLevel = configuredLevel && configuredLevel in levelRank ? configuredLevel : defaultLevel;

type LogPayload = {
    level: LogLevel;
    time: string;
    message: string;
    requestId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    durationMs?: number;
    [key: string]: unknown;
};

const write = (payload: LogPayload) => {
    if (levelRank[payload.level] > levelRank[activeLevel]) {
        return;
    }

    const line = JSON.stringify(payload);
    if (payload.level === 'ERROR') {
        console.error(line);
        return;
    }
    if (payload.level === 'WARN') {
        console.warn(line);
        return;
    }
    console.log(line);
};

export const logger = {
    info: (message: string, details?: Record<string, unknown>) => {
        write({
            level: 'INFO',
            time: new Date().toISOString(),
            message,
            ...(details || {}),
        });
    },
    warn: (message: string, details?: Record<string, unknown>) => {
        write({
            level: 'WARN',
            time: new Date().toISOString(),
            message,
            ...(details || {}),
        });
    },
    error: (message: string, details?: Record<string, unknown>) => {
        write({
            level: 'ERROR',
            time: new Date().toISOString(),
            message,
            ...(details || {}),
        });
    },
};
