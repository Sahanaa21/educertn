"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.disable('x-powered-by');
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
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
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
app.use(maintenanceMode_1.maintenanceModeGuard);
app.use('/api/auth', authRoutes_1.default);
app.use('/api', certificateRoutes_1.default);
app.use('/api', verificationRoutes_1.default);
app.use('/api', supportRoutes_1.default);
app.use('/api', academicServicesRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use((err, _req, res, _next) => {
    if (err instanceof multer_1.default.MulterError) {
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
