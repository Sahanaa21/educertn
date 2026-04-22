import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing in .env');
    throw new Error('DATABASE_URL missing in .env');
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ensureUploadsDir } from './utils/fileStorage';
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

// Initialize Sentry early if configured
initSentryServer();

// Start database health monitoring (logs warnings for slow queries)
startDatabaseHealthMonitoring();

const app = express();
const PORT = Number(process.env.PORT || 5000);
let server: ReturnType<typeof app.listen> | null = null;

const parseAllowedOrigins = (): string[] => {
    const configuredOrigins = String(process.env.FRONTEND_URLS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const singleOrigin = String(process.env.FRONTEND_URL || '').trim();
    const devOrigins = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
        ? []
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    return Array.from(new Set([...configuredOrigins, singleOrigin, ...devOrigins].filter(Boolean)));
};

const allowedOrigins = parseAllowedOrigins();

app.disable('x-powered-by');
app.set('trust proxy', 1);

ensureUploadsDir();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (String(process.env.CORS_ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true') {
            callback(null, true);
            return;
        }

        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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
app.use('/uploads', express.static('uploads'));

const frontendStaticDir = String(process.env.FRONTEND_STATIC_DIR || '').trim();
if (frontendStaticDir) {
    const resolvedFrontendStaticDir = path.resolve(frontendStaticDir);
    if (fs.existsSync(resolvedFrontendStaticDir)) {
        app.use(express.static(resolvedFrontendStaticDir));
    }
}

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

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const requestId = String((req as any)?.requestId || 'unknown');

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            logger.warn('multer_limit_file_size', { requestId, message: err.message });
            return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB.', requestId });
        }
        logger.warn('multer_error', { requestId, code: err.code, message: err.message });
        return res.status(400).json({ message: err.message, requestId });
    }

    const message = typeof err?.message === 'string' ? err.message : 'Internal server error';
    reportServerError(err, {
        requestId,
        category: 'express_unhandled_error',
        message,
    });
    return res.status(500).json({ message, requestId });
});

const startServer = async () => {
    if (server) return server;

    console.log('Connecting to DB...');
    await prisma.$connect();

    server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        logger.info('server_started', { port: PORT });
    });

    return server;
};

const shutdown = async (signal: string) => {
    logger.warn('server_shutdown_signal', { signal });
    if (!server) {
        try {
            await prisma.$disconnect();
            logger.info('server_shutdown_complete_without_listener', { signal });
        } catch (error) {
            logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
        }
        return;
    }

    server.close(async () => {
        try {
            await prisma.$disconnect();
            logger.info('server_shutdown_complete', { signal });
        } catch (error) {
            logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
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
    console.error('Uncaught Exception:', error);
    reportServerError(error, {
        category: 'uncaught_exception',
    });
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    reportServerError(reason, {
        category: 'unhandled_promise_rejection',
    });
});

if (require.main === module) {
    void startServer().catch((error) => {
        console.error('Failed to start server:', error);
        reportServerError(error, {
            category: 'server_start_failure',
        });
    });
}

export { app, startServer };
