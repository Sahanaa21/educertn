import { Request, Response, NextFunction } from 'express';

type RateLimitOptions = {
    windowMs: number;
    max: number;
    keyPrefix: string;
};

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const simpleRateLimit = ({ windowMs, max, keyPrefix }: RateLimitOptions) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();

        const existing = buckets.get(key);
        if (!existing || now > existing.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (existing.count >= max) {
            const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                message: 'Too many requests. Please try again shortly.'
            });
        }

        existing.count += 1;
        buckets.set(key, existing);
        return next();
    };
};
