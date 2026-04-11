import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import authRoutes from './routes/authRoutes';
import certificateRoutes from './routes/certificateRoutes';
import verificationRoutes from './routes/verificationRoutes';
import adminRoutes from './routes/adminRoutes';
import supportRoutes from './routes/supportRoutes';
import academicServicesRoutes from './routes/academicServicesRoutes';
import opsRoutes from './routes/opsRoutes';
import { maintenanceModeGuard } from './middleware/maintenanceMode';
import { requestContext } from './middleware/requestContext';
import { performanceMonitoring } from './middleware/performanceMonitoring';
import { logger } from './utils/logger';
import { reportServerError, initSentryServer } from './utils/errorReporter';
import { startDatabaseHealthMonitoring } from './utils/databaseHealth';
import { prisma } from './config/prisma';

dotenv.config();

// Initialize Sentry early if configured
initSentryServer();

// Start database health monitoring (logs warnings for slow queries)
startDatabaseHealthMonitoring();

const app = express();
const port = process.env.PORT || 5000;
let server: ReturnType<typeof app.listen> | null = null;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const defaultAllowedOrigins = [
    'http://localhost:3000',
    'https://gat-verification-portal.vercel.app'
];

const vercelDeploymentOriginPattern = /^https:\/\/gat-verification-portal(?:-[a-z0-9-]+)?\.vercel\.app$/i;
const allowHttpOrigins = (process.env.ALLOW_HTTP_ORIGINS || 'true').toLowerCase() === 'true';

const allowedOrigins = Array.from(
    new Set(
        [
            process.env.FRONTEND_URL,
            ...(process.env.FRONTEND_URLS || '').split(','),
            ...defaultAllowedOrigins
        ]
            .map((origin) => origin?.trim())
            .filter((origin): origin is string => Boolean(origin))
    )
);

app.use(cors({
    origin: (origin, callback) => {
        const isAllowedVercelDeployment = typeof origin === 'string' && vercelDeploymentOriginPattern.test(origin);
        const isAllowedHttpOrigin = Boolean(origin && allowHttpOrigins && origin.startsWith('http://'));

        if (!origin || allowedOrigins.includes(origin) || isAllowedVercelDeployment || isAllowedHttpOrigin) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
}));
app.use(performanceMonitoring);
app.use(requestContext);
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    if (req.secure || forwardedProto === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/api/health/live', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'backend',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            status: 'ready',
            dependencies: { db: 'up' },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('health_readiness_failed', {
            message: error instanceof Error ? error.message : 'unknown_error',
        });
        return res.status(503).json({
            status: 'not_ready',
            dependencies: { db: 'down' },
            timestamp: new Date().toISOString(),
        });
    }
});

app.get('/api/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            status: 'ok',
            message: 'Backend is running',
            readiness: 'ready',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch {
        return res.status(503).json({
            status: 'degraded',
            message: 'Backend running but database unavailable',
            readiness: 'not_ready',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    }
});

app.get('/', (_req, res) => {
    res.status(200).json({
        service: 'Global Academy of Technology Verification Backend',
        status: 'ok',
        health: '/api/health'
    });
});

app.use(maintenanceModeGuard);

app.use('/api/auth', authRoutes);
app.use('/api', certificateRoutes);
app.use('/api', verificationRoutes);
app.use('/api', supportRoutes);
app.use('/api', academicServicesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ops', opsRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = String(((_req as any)?.requestId) || 'unknown');

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            logger.warn('multer_limit_file_size', { requestId, message: err.message });
            return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB.', requestId });
        }
        logger.warn('multer_error', { requestId, code: err.code, message: err.message });
        return res.status(400).json({ message: err.message, requestId });
    }

    if (err) {
        const message = typeof err.message === 'string' ? err.message : 'Internal server error';
        const status = message.toLowerCase().includes('invalid file type') ? 400 : 500;
        reportServerError(err, {
            requestId,
            category: 'express_unhandled_error',
            message,
        });
        return res.status(status).json({ message, requestId });
    }

    reportServerError(new Error('Unknown express error'), {
        requestId,
        category: 'express_unknown_error',
    });
    return res.status(500).json({ message: 'Internal server error', requestId });
});

const startServer = () => {
    if (server) return server;
    server = app.listen(port, () => {
        logger.info('server_started', { port: Number(port) });
    });
    return server;
};

const shutdown = async (signal: string) => {
    logger.warn('server_shutdown_signal', { signal });
    if (!server) {
        try {
            await prisma.$disconnect();
            logger.info('server_shutdown_complete_without_listener', { signal });
            process.exit(0);
        } catch (error) {
            logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
            process.exit(1);
        }
        return;
    }

    server.close(async () => {
        try {
            await prisma.$disconnect();
            logger.info('server_shutdown_complete', { signal });
            process.exit(0);
        } catch (error) {
            logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
            process.exit(1);
        }
    });
};

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
    reportServerError(error, {
        category: 'uncaught_exception',
    });
});

process.on('unhandledRejection', (reason) => {
    reportServerError(reason, {
        category: 'unhandled_promise_rejection',
    });
});

if (require.main === module) {
    startServer();
}

export { app, startServer };
