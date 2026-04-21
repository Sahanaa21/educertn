import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface PerformanceMetrics {
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    timestamp: string;
}

const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000');
const CRITICAL_REQUEST_THRESHOLD_MS = Number(process.env.CRITICAL_REQUEST_THRESHOLD_MS || '5000');

const shouldSuppressSlowRequestLog = (path: string) => {
    return /(^|\/)(request-otp|verify-unified-otp|verify-otp)$/.test(path);
};

/**
 * Middleware to track request performance metrics
 * Logs slow and critical requests automatically
 */
export const performanceMonitoring = (_req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (data: any) {
        const responseTimeMs = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = _req.method;
        const path = _req.path;

        const metrics: PerformanceMetrics = {
            method,
            path,
            statusCode,
            responseTimeMs,
            timestamp: new Date().toISOString(),
        };

        // Log critical responses
        if (responseTimeMs > CRITICAL_REQUEST_THRESHOLD_MS && !shouldSuppressSlowRequestLog(path)) {
            logger.error('slow_request_critical', {
                ...metrics,
                message: `Critical: Request took ${responseTimeMs}ms`,
            } as unknown as Record<string, unknown>);
        }
        // Log slow responses
        else if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS && !shouldSuppressSlowRequestLog(path)) {
            logger.warn('slow_request', {
                ...metrics,
                message: `Slow: Request took ${responseTimeMs}ms`,
            } as unknown as Record<string, unknown>);
        }
        // Log all requests in development
        else if (process.env.NODE_ENV !== 'production') {
            logger.info('request_completed', metrics as unknown as Record<string, unknown>);
        }

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Collects performance metrics for specific database queries
 */
export class QueryPerformanceTracker {
    private static readonly queries: PerformanceMetrics[] = [];
    private static readonly maxQueriesTracked = 100;

    static trackQuery(
        query: string,
        durationMs: number,
        params?: Record<string, any>
    ) {
        const isSlowQuery = durationMs > SLOW_REQUEST_THRESHOLD_MS;
        const isCriticalQuery = durationMs > CRITICAL_REQUEST_THRESHOLD_MS;

        if (isCriticalQuery) {
            logger.error('slow_database_query_critical', {
                query: query.substring(0, 200),
                durationMs,
                params: JSON.stringify(params).substring(0, 200),
                message: `Critical: Database query took ${durationMs}ms`,
            });
        } else if (isSlowQuery) {
            logger.warn('slow_database_query', {
                query: query.substring(0, 200),
                durationMs,
                params: JSON.stringify(params).substring(0, 200),
            });
        }

        // Store recent queries for analysis
        if (isSlowQuery || isCriticalQuery) {
            this.queries.push({
                method: 'QUERY',
                path: query.substring(0, 50),
                statusCode: durationMs > CRITICAL_REQUEST_THRESHOLD_MS ? 503 : 200,
                responseTimeMs: durationMs,
                timestamp: new Date().toISOString(),
            });

            if (this.queries.length > this.maxQueriesTracked) {
                this.queries.shift();
            }
        }
    }

    static getSlowQueries(limit: number = 10): PerformanceMetrics[] {
        return this.queries
            .sort((a, b) => b.responseTimeMs - a.responseTimeMs)
            .slice(0, limit);
    }

    static getCriticalQueries(): PerformanceMetrics[] {
        return this.queries.filter((q) => q.responseTimeMs > CRITICAL_REQUEST_THRESHOLD_MS);
    }

    static reset() {
        this.queries.length = 0;
    }
}

/**
 * Performance monitoring utility for Prisma queries
 * Usage:
 * const start = Date.now();
 * const result = await prisma.user.findMany();
 * measureQueryPerformance('findMany', 'User', Date.now() - start);
 */
export const measureQueryPerformance = (
    operation: string,
    model: string,
    durationMs: number
) => {
    const query = `${model}.${operation}`;
    QueryPerformanceTracker.trackQuery(query, durationMs);
};
