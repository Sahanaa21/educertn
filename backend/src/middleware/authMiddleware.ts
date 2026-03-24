import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): any => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
};

export const requireRole = (role: 'STUDENT' | 'ADMIN' | 'COMPANY') => {
    return (req: AuthRequest, res: Response, next: NextFunction): any => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
