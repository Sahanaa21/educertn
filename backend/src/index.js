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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const certificateRoutes_1 = __importDefault(require("./routes/certificateRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const academicServicesRoutes_1 = __importDefault(require("./routes/academicServicesRoutes"));
const maintenanceMode_1 = require("./middleware/maintenanceMode");
const requestContext_1 = require("./middleware/requestContext");
const logger_1 = require("./utils/logger");
const errorReporter_1 = require("./utils/errorReporter");
const prisma_1 = require("./config/prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 5000;
let server = null;
app.disable('x-powered-by');
app.set('trust proxy', 1);
const defaultAllowedOrigins = [
    'http://localhost:3000',
    'https://gat-verification-portal.vercel.app'
];
const vercelDeploymentOriginPattern = /^https:\/\/gat-verification-portal(?:-[a-z0-9-]+)?\.vercel\.app$/i;
const allowedOrigins = Array.from(new Set([
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(','),
    ...defaultAllowedOrigins
]
    .map((origin) => origin === null || origin === void 0 ? void 0 : origin.trim())
    .filter((origin) => Boolean(origin))));
app.use((0, cors_1.default)({
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
app.use(requestContext_1.requestContext);
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
app.use(express_1.default.json({ limit: '100kb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '100kb' }));
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
app.get('/api/health/live', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'backend',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});
app.get('/api/health/ready', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.$queryRaw `SELECT 1`;
        return res.status(200).json({
            status: 'ready',
            dependencies: { db: 'up' },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('health_readiness_failed', {
            message: error instanceof Error ? error.message : 'unknown_error',
        });
        return res.status(503).json({
            status: 'not_ready',
            dependencies: { db: 'down' },
            timestamp: new Date().toISOString(),
        });
    }
}));
app.get('/api/health', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.$queryRaw `SELECT 1`;
        return res.status(200).json({
            status: 'ok',
            message: 'Backend is running',
            readiness: 'ready',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    }
    catch (_a) {
        return res.status(503).json({
            status: 'degraded',
            message: 'Backend running but database unavailable',
            readiness: 'not_ready',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    }
}));
app.get('/', (_req, res) => {
    res.status(200).json({
        service: 'Global Academy of Technology Verification Backend',
        status: 'ok',
        health: '/api/health'
    });
});
app.use(maintenanceMode_1.maintenanceModeGuard);
app.use('/api/auth', authRoutes_1.default);
app.use('/api', certificateRoutes_1.default);
app.use('/api', verificationRoutes_1.default);
app.use('/api', supportRoutes_1.default);
app.use('/api', academicServicesRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use((err, _req, res, _next) => {
    const requestId = String((_req === null || _req === void 0 ? void 0 : _req.requestId) || 'unknown');
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            logger_1.logger.warn('multer_limit_file_size', { requestId, message: err.message });
            return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB.', requestId });
        }
        logger_1.logger.warn('multer_error', { requestId, code: err.code, message: err.message });
        return res.status(400).json({ message: err.message, requestId });
    }
    if (err) {
        const message = typeof err.message === 'string' ? err.message : 'Internal server error';
        const status = message.toLowerCase().includes('invalid file type') ? 400 : 500;
        (0, errorReporter_1.reportServerError)(err, {
            requestId,
            category: 'express_unhandled_error',
            message,
        });
        return res.status(status).json({ message, requestId });
    }
    (0, errorReporter_1.reportServerError)(new Error('Unknown express error'), {
        requestId,
        category: 'express_unknown_error',
    });
    return res.status(500).json({ message: 'Internal server error', requestId });
});
const startServer = () => {
    if (server)
        return server;
    server = app.listen(port, () => {
        logger_1.logger.info('server_started', { port: Number(port) });
    });
    return server;
};
exports.startServer = startServer;
const shutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.warn('server_shutdown_signal', { signal });
    if (!server) {
        try {
            yield prisma_1.prisma.$disconnect();
            logger_1.logger.info('server_shutdown_complete_without_listener', { signal });
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
            process.exit(1);
        }
        return;
    }
    server.close(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield prisma_1.prisma.$disconnect();
            logger_1.logger.info('server_shutdown_complete', { signal });
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('server_shutdown_failed', {
                signal,
                message: error instanceof Error ? error.message : 'unknown_error',
            });
            process.exit(1);
        }
    }));
});
process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
    void shutdown('SIGINT');
});
process.on('uncaughtException', (error) => {
    (0, errorReporter_1.reportServerError)(error, {
        category: 'uncaught_exception',
    });
});
process.on('unhandledRejection', (reason) => {
    (0, errorReporter_1.reportServerError)(reason, {
        category: 'unhandled_promise_rejection',
    });
});
if (require.main === module) {
    startServer();
}
