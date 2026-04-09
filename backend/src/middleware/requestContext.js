"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const getRequestId = (req) => {
    const headerId = String(req.headers['x-request-id'] || '').trim();
    if (headerId)
        return headerId;
    if (typeof crypto_1.default.randomUUID === 'function') {
        return crypto_1.default.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
};
const requestContext = (req, res, next) => {
    const requestId = getRequestId(req);
    const start = Date.now();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
        logger_1.logger.info('http_request_completed', {
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
exports.requestContext = requestContext;
