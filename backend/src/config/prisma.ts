import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

dotenv.config();

const buildDatabaseUrlFromEnv = (): string | null => {
    const existingUrl = String(process.env.DATABASE_URL || '').trim();
    if (existingUrl) {
        return existingUrl;
    }

    const host = String(process.env.DB_HOST || '').trim();
    const port = Number(process.env.DB_PORT || 3306);
    const user = String(process.env.DB_USER || '').trim();
    const password = String(process.env.DB_PASSWORD || '').trim();
    const database = String(process.env.DB_NAME || '').trim();

    if (!host || !user || !database) {
        return null;
    }

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const authPart = password ? `${encodedUser}:${encodedPassword}` : encodedUser;
    const databaseUrl = `mysql://${authPart}@${host}:${port}/${database}`;
    process.env.DATABASE_URL = databaseUrl;
    return databaseUrl;
};

const getPrismaClient = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    buildDatabaseUrlFromEnv();
    
    const prismaClient = new PrismaClient({
        log: isProduction 
            ? [] // No logs in production for performance
            : [
                  { level: 'warn', emit: 'event' },
                  { level: 'error', emit: 'event' },
              ],
    });

    // Log warnings and errors in development
    if (!isProduction) {
        prismaClient.$on('warn', (e) => {
            logger.warn('prisma_warning', {
                message: e.message,
                code: (e as any).code,
            });
        });
        prismaClient.$on('error', (e) => {
            logger.error('prisma_error', {
                message: (e as any).message,
                code: (e as any).code,
            });
        });
    }

    // Graceful shutdown hook
    const setShutdownHook = () => {
        process.on('SIGINT', async () => {
            logger.info('prisma_disconnect_signal', { signal: 'SIGINT' });
            await prismaClient.$disconnect();
            process.exit(0);
        });
    };

    if (typeof setShutdownHook === 'function') {
        setShutdownHook();
    }

    return prismaClient;
};

export const prisma = getPrismaClient();
