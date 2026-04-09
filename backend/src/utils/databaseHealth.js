"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDatabaseHealthMonitoring = exports.checkDatabaseHealth = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("./logger");
/**
 * Checks database connectivity and measures query latency
 * Use this for monitoring database connection pool health
 */
const checkDatabaseHealth = () => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    try {
        yield prisma_1.prisma.$queryRaw `SELECT 1`;
        const latencyMs = Date.now() - startTime;
        return {
            healthy: true,
            latencyMs,
            timestamp: new Date().toISOString(),
        };
    }
    catch (error) {
        logger_1.logger.error('database_health_check_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
            latencyMs: Date.now() - startTime,
        });
        return {
            healthy: false,
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
});
exports.checkDatabaseHealth = checkDatabaseHealth;
/**
 * Periodically checks database health and logs warnings if latency is high
 * Optionally trigger alerts for critical cases
 */
const startDatabaseHealthMonitoring = (intervalMs = 60000) => {
    const monitoringInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const metrics = yield (0, exports.checkDatabaseHealth)();
            if (!metrics.healthy) {
                logger_1.logger.error('database_health_monitoring', {
                    status: 'unhealthy',
                    latencyMs: metrics.latencyMs,
                });
            }
            else if (metrics.latencyMs > 1000) {
                logger_1.logger.warn('database_health_monitoring', {
                    status: 'slow',
                    latencyMs: metrics.latencyMs,
                    message: 'Database query latency exceeds 1 second',
                });
            }
        }
        catch (error) {
            logger_1.logger.error('database_health_monitoring_failed', {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }), intervalMs);
    // Allow graceful shutdown
    return () => clearInterval(monitoringInterval);
};
exports.startDatabaseHealthMonitoring = startDatabaseHealthMonitoring;
