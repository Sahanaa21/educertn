import { prisma } from '../config/prisma';
import { logger } from './logger';

export interface DatabasePoolMetrics {
    healthy: boolean;
    latencyMs: number;
    timestamp: string;
}

/**
 * Checks database connectivity and measures query latency
 * Use this for monitoring database connection pool health
 */
export const checkDatabaseHealth = async (): Promise<DatabasePoolMetrics> => {
    const startTime = Date.now();
    
    try {
        await prisma.$queryRaw`SELECT 1`;
        const latencyMs = Date.now() - startTime;
        
        return {
            healthy: true,
            latencyMs,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('database_health_check_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
            latencyMs: Date.now() - startTime,
        });
        
        return {
            healthy: false,
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
};

/**
 * Periodically checks database health and logs warnings if latency is high
 * Optionally trigger alerts for critical cases
 */
export const startDatabaseHealthMonitoring = (intervalMs: number = 60000) => {
    const monitoringInterval = setInterval(async () => {
        try {
            const metrics = await checkDatabaseHealth();
            
            if (!metrics.healthy) {
                logger.error('database_health_monitoring', {
                    status: 'unhealthy',
                    latencyMs: metrics.latencyMs,
                });
            } else if (metrics.latencyMs > 1000) {
                logger.warn('database_health_monitoring', {
                    status: 'slow',
                    latencyMs: metrics.latencyMs,
                    message: 'Database query latency exceeds 1 second',
                });
            }
        } catch (error) {
            logger.error('database_health_monitoring_failed', {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }, intervalMs);

    // Allow graceful shutdown
    return () => clearInterval(monitoringInterval);
};
