"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureQueryPerformance = exports.QueryPerformanceTracker = exports.performanceMonitoring = void 0;
const logger_1 = require("../utils/logger");
const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000');
const CRITICAL_REQUEST_THRESHOLD_MS = Number(process.env.CRITICAL_REQUEST_THRESHOLD_MS || '5000');
/**
 * Middleware to track request performance metrics
 * Logs slow and critical requests automatically
 */
const performanceMonitoring = (_req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    res.send = function (data) {
        const responseTimeMs = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = _req.method;
        const path = _req.path;
        const metrics = {
            method,
            path,
            statusCode,
            responseTimeMs,
            timestamp: new Date().toISOString(),
        };
        // Log critical responses
        if (responseTimeMs > CRITICAL_REQUEST_THRESHOLD_MS) {
            logger_1.logger.error('slow_request_critical', Object.assign(Object.assign({}, metrics), { message: `Critical: Request took ${responseTimeMs}ms` }));
        }
        // Log slow responses
        else if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS) {
            logger_1.logger.warn('slow_request', Object.assign(Object.assign({}, metrics), { message: `Slow: Request took ${responseTimeMs}ms` }));
        }
        // Log all requests in development
        else if (process.env.NODE_ENV !== 'production') {
            logger_1.logger.info('request_completed', metrics);
        }
        return originalSend.call(this, data);
    };
    next();
};
exports.performanceMonitoring = performanceMonitoring;
/**
 * Collects performance metrics for specific database queries
 */
class QueryPerformanceTracker {
    static trackQuery(query, durationMs, params) {
        const isSlowQuery = durationMs > SLOW_REQUEST_THRESHOLD_MS;
        const isCriticalQuery = durationMs > CRITICAL_REQUEST_THRESHOLD_MS;
        if (isCriticalQuery) {
            logger_1.logger.error('slow_database_query_critical', {
                query: query.substring(0, 200),
                durationMs,
                params: JSON.stringify(params).substring(0, 200),
                message: `Critical: Database query took ${durationMs}ms`,
            });
        }
        else if (isSlowQuery) {
            logger_1.logger.warn('slow_database_query', {
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
    static getSlowQueries(limit = 10) {
        return this.queries
            .sort((a, b) => b.responseTimeMs - a.responseTimeMs)
            .slice(0, limit);
    }
    static getCriticalQueries() {
        return this.queries.filter((q) => q.responseTimeMs > CRITICAL_REQUEST_THRESHOLD_MS);
    }
    static reset() {
        this.queries.length = 0;
    }
}
exports.QueryPerformanceTracker = QueryPerformanceTracker;
QueryPerformanceTracker.queries = [];
QueryPerformanceTracker.maxQueriesTracked = 100;
/**
 * Performance monitoring utility for Prisma queries
 * Usage:
 * const start = Date.now();
 * const result = await prisma.user.findMany();
 * measureQueryPerformance('findMany', 'User', Date.now() - start);
 */
const measureQueryPerformance = (operation, model, durationMs) => {
    const query = `${model}.${operation}`;
    QueryPerformanceTracker.trackQuery(query, durationMs);
};
exports.measureQueryPerformance = measureQueryPerformance;
