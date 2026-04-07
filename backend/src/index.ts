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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
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
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB.' });
        }
        return res.status(400).json({ message: err.message });
    }

    if (err) {
        const message = typeof err.message === 'string' ? err.message : 'Internal server error';
        const status = message.toLowerCase().includes('invalid file type') ? 400 : 500;
        return res.status(status).json({ message });
    }

    return res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
