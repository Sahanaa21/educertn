"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleRateLimit = void 0;
const buckets = new Map();
const simpleRateLimit = ({ windowMs, max, keyPrefix }) => {
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();
        const existing = buckets.get(key);
        if (!existing || now > existing.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (existing.count >= max) {
            return res.status(429).json({
                message: 'Too many requests. Please try again shortly.'
            });
        }
        existing.count += 1;
        buckets.set(key, existing);
        return next();
    };
};
exports.simpleRateLimit = simpleRateLimit;
