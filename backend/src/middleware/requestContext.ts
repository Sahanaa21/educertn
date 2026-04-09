import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const getRequestId = (req: Request) => {
    const headerId = String(req.headers['x-request-id'] || '').trim();
    if (headerId) return headerId;

    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
};

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const start = Date.now();

    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
        logger.info('http_request_completed', {
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
        });
    });

    next();
};
