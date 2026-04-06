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
exports.maintenanceModeGuard = void 0;
const prisma_1 = require("../config/prisma");
const auth_1 = require("../utils/auth");
const ADMIN_BYPASS_PATHS = [
    '/api/auth/request-otp',
    '/api/auth/verify-unified-otp',
    '/api/health'
];
const maintenanceModeGuard = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (ADMIN_BYPASS_PATHS.includes(req.path)) {
            return next();
        }
        const settings = yield prisma_1.prisma.portalSettings.findUnique({ where: { id: 1 } });
        if (!(settings === null || settings === void 0 ? void 0 : settings.maintenanceMode)) {
            return next();
        }
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1]);
        if (token) {
            const decoded = (0, auth_1.verifyToken)(token);
            if ((decoded === null || decoded === void 0 ? void 0 : decoded.role) === 'ADMIN') {
                return next();
            }
        }
        return res.status(503).json({
            message: 'Portal is temporarily under maintenance. Please try again shortly.'
        });
    }
    catch (_c) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.maintenanceModeGuard = maintenanceModeGuard;
