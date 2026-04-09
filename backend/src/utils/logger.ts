type LogLevel = 'INFO' | 'WARN' | 'ERROR';

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
