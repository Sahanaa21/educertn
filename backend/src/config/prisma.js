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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const getPrismaClient = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const prismaClient = new client_1.PrismaClient({
        log: isProduction
            ? [] // No logs in production for performance
            : [
                { level: 'warn', emit: 'event' },
                { level: 'error', emit: 'event' },
            ],
    });
    // Log warnings and errors in development
    if (!isProduction) {
        prismaClient.$on('warn', (e) => {
            logger_1.logger.warn('prisma_warning', {
                message: e.message,
                code: e.code,
            });
        });
        prismaClient.$on('error', (e) => {
            logger_1.logger.error('prisma_error', {
                message: e.message,
                code: e.code,
            });
        });
    }
    // Graceful shutdown hook
    const setShutdownHook = () => {
        process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.logger.info('prisma_disconnect_signal', { signal: 'SIGINT' });
            yield prismaClient.$disconnect();
            process.exit(0);
        }));
    };
    if (typeof setShutdownHook === 'function') {
        setShutdownHook();
    }
    return prismaClient;
};
exports.prisma = getPrismaClient();
