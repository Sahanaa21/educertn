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
import { maintenanceModeGuard } from './middleware/maintenanceMode';
import { requestContext } from './middleware/requestContext';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const defaultAllowedOrigins = [
    'http://localhost:3000',
    'https://gat-verification-portal.vercel.app'
];

const vercelDeploymentOriginPattern = /^https:\/\/gat-verification-portal(?:-[a-z0-9-]+)?\.vercel\.app$/i;

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

        if (!origin || allowedOrigins.includes(origin) || isAllowedVercelDeployment) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
}));
app.use(requestContext);
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
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
        logger.error('unhandled_error', {
            requestId,
            message,
            stack: typeof err?.stack === 'string' ? err.stack : undefined,
        });
        return res.status(status).json({ message, requestId });
    }

    logger.error('unhandled_error_unknown', { requestId });
    return res.status(500).json({ message: 'Internal server error', requestId });
});

app.listen(port, () => {
    logger.info('server_started', { port: Number(port) });
});
