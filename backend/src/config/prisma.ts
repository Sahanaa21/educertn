import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const getPrismaClient = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
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
