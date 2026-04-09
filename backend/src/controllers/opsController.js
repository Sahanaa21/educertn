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
exports.getOpsIssuesSummary = exports.getOpsMetrics = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const getOpsMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Database health check
        const dbStartTime = Date.now();
        let dbLatency = 0;
        let dbHealth = 'up';
        try {
            yield prisma_1.prisma.$queryRaw `SELECT 1`;
            dbLatency = Date.now() - dbStartTime;
        }
        catch (error) {
            dbHealth = 'down';
            logger_1.logger.error('ops_dashboard_db_check_failed', {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        // Issues metrics - count all issues
        const allIssues = yield prisma_1.prisma.issueReport.findMany({
            select: { category: true, status: true, createdAt: true }
        });
        const byCategory = {};
        const byStatus = {};
        allIssues.forEach((issue) => {
            byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
            byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
        });
        const openCount = allIssues.filter(i => i.status === 'OPEN').length;
        // Request metrics
        const [certRequests, verRequests, acaRequests] = yield Promise.all([
            prisma_1.prisma.certificateRequest.findMany({ select: { status: true } }),
            prisma_1.prisma.verificationRequest.findMany({ select: { status: true } }),
            prisma_1.prisma.academicServiceRequest.findMany({ select: { status: true } }),
        ]);
        const buildStatusCounts = (requests, types) => {
            const result = {
                total: requests.length,
                pending: 0,
                completed: 0,
                rejected: 0,
            };
            requests.forEach((req) => {
                if (req.status === 'PENDING' || req.status === 'IN_PROGRESS' || req.status === 'UNDER_REVIEW')
                    result.pending += 1;
                if (req.status === 'COMPLETED' || req.status === 'RESULT_PUBLISHED')
                    result.completed += 1;
                if (req.status === 'REJECTED')
                    result.rejected += 1;
            });
            return result;
        };
        // Recent activity
        const issuesLast24h = allIssues.filter(i => new Date(i.createdAt) >= twentyFourHoursAgo).length;
        const certCompleted = certRequests.filter(r => r.status === 'COMPLETED').length;
        const verCompleted = verRequests.filter(r => r.status === 'COMPLETED').length;
        const acaCompleted = acaRequests.filter(r => String(r.status) === 'COMPLETED' || String(r.status) === 'RESULT_PUBLISHED').length;
        const metrics = {
            system: {
                uptime: Math.floor(process.uptime()),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development',
                timestamp: now.toISOString(),
            },
            health: {
                database: dbHealth,
                databaseLatencyMs: dbLatency,
            },
            issues: {
                total: allIssues.length,
                byCategory,
                byStatus,
                openCount,
            },
            requests: {
                certificateRequests: buildStatusCounts(certRequests, []),
                verificationRequests: buildStatusCounts(verRequests, []),
                academicServiceRequests: buildStatusCounts(acaRequests, []),
            },
            recent: {
                issuesLast24h,
                requestsCompletedLast24h: certCompleted + verCompleted + acaCompleted,
                errorsLogged: 0, // Could integrate with structured logging
            },
        };
        res.status(200).json(metrics);
    }
    catch (error) {
        logger_1.logger.error('get_ops_metrics_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            message: 'Failed to retrieve ops metrics',
        });
    }
});
exports.getOpsMetrics = getOpsMetrics;
const getOpsIssuesSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const issues = yield prisma_1.prisma.issueReport.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                title: true,
                status: true,
                category: true,
                createdAt: true,
                reportedByEmail: true,
            },
        });
        res.status(200).json({ issues });
    }
    catch (error) {
        logger_1.logger.error('get_ops_issues_summary_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            message: 'Failed to retrieve issues summary',
        });
    }
});
exports.getOpsIssuesSummary = getOpsIssuesSummary;
