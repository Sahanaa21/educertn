import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyToken } from '../utils/auth';

const ADMIN_BYPASS_PATHS = [
    '/api/auth/request-otp',
    '/api/auth/verify-unified-otp',
    '/api/health'
];

export const maintenanceModeGuard = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        if (ADMIN_BYPASS_PATHS.includes(req.path)) {
            return next();
        }

        const settings = await (prisma as any).portalSettings.findUnique({ where: { id: 1 } });
        if (!settings?.maintenanceMode) {
            return next();
        }

        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = verifyToken(token) as { role?: string } | null;
            if (decoded?.role === 'ADMIN') {
                return next();
            }
        }

        return res.status(503).json({
            message: 'Portal is temporarily under maintenance. Please try again shortly.'
        });
    } catch {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
