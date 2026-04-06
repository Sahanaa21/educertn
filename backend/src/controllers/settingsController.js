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
exports.removeAdminEmail = exports.registerAdminEmail = exports.updatePortalSettings = exports.getPortalSettings = void 0;
const prisma_1 = require("../config/prisma");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ADMIN_ALLOWLIST = ['sahanaa2060@gmail.com'];
const parseAdminAllowlist = (raw) => {
    const parsed = String(raw || '')
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_REGEX.test(email));
    return Array.from(new Set(parsed));
};
const mergeAllowlistWithDefaults = (allowlist) => {
    return Array.from(new Set([...DEFAULT_ADMIN_ALLOWLIST, ...allowlist]));
};
const defaultFrontendUrl = ((_a = process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.trim())
    || ((_b = process.env.FRONTEND_URLS) === null || _b === void 0 ? void 0 : _b.split(',').map((url) => url.trim()).find(Boolean))
    || 'https://gat-verification-portal.vercel.app';
const DEFAULT_SETTINGS = {
    id: 1,
    supportEmail: 'support@gat.ac.in',
    frontendUrl: defaultFrontendUrl,
    maintenanceMode: false,
    allowCompanySignup: true,
    smtpFromName: 'Global Academy of Technology',
    adminAllowedEmails: DEFAULT_ADMIN_ALLOWLIST.join('\n')
};
const getPortalSettings = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });
        const normalizedAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(settings === null || settings === void 0 ? void 0 : settings.adminAllowedEmails));
        return res.json(Object.assign(Object.assign({}, settings), { adminAllowedEmails: normalizedAllowlist.join('\n') }));
    }
    catch (error) {
        console.error('Error fetching portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPortalSettings = getPortalSettings;
const updatePortalSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { supportEmail, frontendUrl, maintenanceMode, allowCompanySignup, smtpFromName, adminAllowedEmails } = req.body;
        if (!supportEmail || !frontendUrl || !smtpFromName) {
            return res.status(400).json({ message: 'supportEmail, frontendUrl and smtpFromName are required' });
        }
        const mergedAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(adminAllowedEmails));
        const updated = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim(),
                adminAllowedEmails: mergedAllowlist.join('\n')
            },
            create: {
                id: 1,
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim(),
                adminAllowedEmails: mergedAllowlist.join('\n')
            }
        });
        return res.json(Object.assign(Object.assign({}, updated), { adminAllowedEmails: mergedAllowlist.join('\n') }));
    }
    catch (error) {
        console.error('Error updating portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updatePortalSettings = updatePortalSettings;
const registerAdminEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }
        const settings = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });
        const currentAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(settings === null || settings === void 0 ? void 0 : settings.adminAllowedEmails));
        if (!currentAllowlist.includes(email)) {
            currentAllowlist.push(email);
        }
        yield prisma_1.prisma.portalSettings.update({
            where: { id: 1 },
            data: { adminAllowedEmails: currentAllowlist.join('\n') }
        });
        const existingUser = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (!existingUser) {
            yield prisma_1.prisma.user.create({
                data: {
                    email,
                    role: 'ADMIN',
                    name: 'Admin'
                }
            });
        }
        else if (existingUser.role !== 'ADMIN') {
            yield prisma_1.prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'ADMIN' }
            });
        }
        return res.json({
            message: 'Admin email registered successfully',
            adminAllowedEmails: currentAllowlist.join('\n')
        });
    }
    catch (error) {
        console.error('Error registering admin email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.registerAdminEmail = registerAdminEmail;
const removeAdminEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }
        const settings = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });
        const currentAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(settings === null || settings === void 0 ? void 0 : settings.adminAllowedEmails));
        if (!currentAllowlist.includes(email)) {
            return res.status(404).json({ message: 'Admin email not found in allowlist' });
        }
        if (currentAllowlist.length <= 1) {
            return res.status(400).json({ message: 'Cannot remove the last admin email' });
        }
        const authUserId = String(((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || '').trim();
        if (authUserId) {
            const currentAdmin = yield prisma_1.prisma.user.findUnique({ where: { id: authUserId }, select: { email: true } });
            if (((_c = currentAdmin === null || currentAdmin === void 0 ? void 0 : currentAdmin.email) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === email) {
                return res.status(400).json({ message: 'You cannot remove your own admin email while signed in' });
            }
        }
        const nextAllowlist = currentAllowlist.filter((entry) => entry !== email);
        yield prisma_1.prisma.portalSettings.update({
            where: { id: 1 },
            data: { adminAllowedEmails: nextAllowlist.join('\n') }
        });
        const existingUser = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.role) === 'ADMIN') {
            yield prisma_1.prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'STUDENT' }
            });
        }
        return res.json({
            message: 'Admin email removed successfully',
            adminAllowedEmails: nextAllowlist.join('\n')
        });
    }
    catch (error) {
        console.error('Error removing admin email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.removeAdminEmail = removeAdminEmail;
