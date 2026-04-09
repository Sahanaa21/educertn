import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { RequestHandler } from 'express';

interface OpsMetrics {
    system: {
        uptime: number;
        nodeVersion: string;
        environment: string;
        timestamp: string;
    };
    health: {
        database: 'up' | 'down';
        databaseLatencyMs: number;
    };
    issues: {
        total: number;
        byCategory: Record<string, number>;
        byStatus: Record<string, number>;
        openCount: number;
    };
    requests: {
        certificateRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
        verificationRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
        academicServiceRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
    };
    recent: {
        issuesLast24h: number;
        requestsCompletedLast24h: number;
        errorsLogged: number;
    };
}

export const getOpsMetrics: RequestHandler = async (req, res) => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Database health check
        const dbStartTime = Date.now();
        let dbLatency = 0;
        let dbHealth: 'up' | 'down' = 'up';
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbLatency = Date.now() - dbStartTime;
        } catch (error) {
            dbHealth = 'down';
            logger.error('ops_dashboard_db_check_failed', {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Issues metrics - count all issues
        const allIssues = await prisma.issueReport.findMany({
            select: { category: true, status: true, createdAt: true }
        });

        const byCategory: Record<string, number> = {};
        const byStatus: Record<string, number> = {};

        allIssues.forEach((issue) => {
            byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
            byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
        });

        const openCount = allIssues.filter(i => i.status === 'OPEN').length;

        // Request metrics
        const [certRequests, verRequests, acaRequests] = await Promise.all([
            prisma.certificateRequest.findMany({ select: { status: true } }),
            prisma.verificationRequest.findMany({ select: { status: true } }),
            prisma.academicServiceRequest.findMany({ select: { status: true } }),
        ]);

        const buildStatusCounts = (requests: any[], types: string[]) => {
            const result = {
                total: requests.length,
                pending: 0,
                completed: 0,
                rejected: 0,
            };
            requests.forEach((req) => {
                if (req.status === 'PENDING' || req.status === 'IN_PROGRESS' || req.status === 'UNDER_REVIEW') result.pending += 1;
                if (req.status === 'COMPLETED' || req.status === 'RESULT_PUBLISHED') result.completed += 1;
                if (req.status === 'REJECTED') result.rejected += 1;
            });
            return result;
        };

        // Recent activity
        const issuesLast24h = allIssues.filter(i => 
            new Date(i.createdAt as any) >= twentyFourHoursAgo
        ).length;

        const certCompleted = certRequests.filter(r => 
            r.status === 'COMPLETED'
        ).length;
        const verCompleted = verRequests.filter(r => 
            r.status === 'COMPLETED'
        ).length;
        const acaCompleted = acaRequests.filter(r => 
            String(r.status) === 'COMPLETED' || String(r.status) === 'RESULT_PUBLISHED'
        ).length;

        const metrics: OpsMetrics = {
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
    } catch (error) {
        logger.error('get_ops_metrics_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            message: 'Failed to retrieve ops metrics',
        });
    }
};

export const getOpsIssuesSummary: RequestHandler = async (req, res) => {
    try {
        const issues = await prisma.issueReport.findMany({
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
    } catch (error) {
        logger.error('get_ops_issues_summary_failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            message: 'Failed to retrieve issues summary',
        });
    }
};
