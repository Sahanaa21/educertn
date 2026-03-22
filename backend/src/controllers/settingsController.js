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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePortalSettings = exports.getPortalSettings = void 0;
const prisma_1 = require("../config/prisma");
const defaultFrontendUrl = ((_a = process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.trim())
    || ((_b = process.env.FRONTEND_URLS) === null || _b === void 0 ? void 0 : _b.split(',').map((url) => url.trim()).find(Boolean))
    || 'https://gat-verification-portal.vercel.app';
const DEFAULT_SETTINGS = {
    id: 1,
    supportEmail: 'support@gat.ac.in',
    frontendUrl: defaultFrontendUrl,
    maintenanceMode: false,
    allowCompanySignup: true,
    smtpFromName: 'Global Academy of Technology'
};
const getPortalSettings = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });
        return res.json(settings);
    }
    catch (error) {
        console.error('Error fetching portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPortalSettings = getPortalSettings;
const updatePortalSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { supportEmail, frontendUrl, maintenanceMode, allowCompanySignup, smtpFromName } = req.body;
        if (!supportEmail || !frontendUrl || !smtpFromName) {
            return res.status(400).json({ message: 'supportEmail, frontendUrl and smtpFromName are required' });
        }
        const updated = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim()
            },
            create: {
                id: 1,
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim()
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Error updating portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updatePortalSettings = updatePortalSettings;
