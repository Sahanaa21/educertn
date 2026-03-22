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
exports.changeAdminPassword = exports.adminLogin = exports.verifyOtp = exports.companyLogin = exports.studentLogin = void 0;
const prisma_1 = require("../config/prisma");
const auth_1 = require("../utils/auth");
const email_1 = require("../utils/email");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isInvalidRecipientError = (error) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
    return [
        'recipient rejected',
        'user unknown',
        'invalid recipient',
        'no such user',
        'mailbox unavailable',
        '550',
        '553',
        '5.1.1',
        '5.1.0',
    ].some((part) => message.includes(part));
};
const studentLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const normalizedEmail = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        yield (0, email_1.sendEmail)(normalizedEmail, 'Your OTP for Global Academy of Technology', `<p>Your One-Time Password (OTP) for Global Academy of Technology is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>`);
        let user = yield prisma_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({
                data: { email: normalizedEmail, role: 'STUDENT' }
            });
        }
        yield prisma_1.prisma.oTP.create({
            data: {
                email: normalizedEmail,
                otp,
                expiresAt
            }
        });
        res.json({ message: 'OTP sent to your email. Check your inbox.' });
    }
    catch (error) {
        console.error('Student login OTP send failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        res.status(500).json({ message: 'Failed to send OTP. Please verify the email address and try again.' });
    }
});
exports.studentLogin = studentLogin;
const companyLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const normalizedEmail = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Enter a valid company email address' });
    }
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        yield (0, email_1.sendEmail)(normalizedEmail, 'Your Company Verification OTP - Global Academy of Technology', `<p>Your One-Time Password (OTP) for company verification is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>`);
        let user = yield prisma_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({
                data: { email: normalizedEmail, role: 'COMPANY' }
            });
        }
        yield prisma_1.prisma.oTP.create({
            data: {
                email: normalizedEmail,
                otp,
                expiresAt
            }
        });
        res.json({ message: 'OTP sent to your company email. Check your inbox.' });
    }
    catch (error) {
        console.error('Company login OTP send failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        res.status(500).json({ message: 'Failed to send OTP to company email. Please verify the email address.' });
    }
});
exports.companyLogin = companyLogin;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    const otp = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.otp) || '').trim();
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
    }
    try {
        const user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        const validOtp = yield prisma_1.prisma.oTP.findFirst({
            where: { email, otp },
            orderBy: { createdAt: 'desc' }
        });
        if (!validOtp || validOtp.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        yield prisma_1.prisma.oTP.deleteMany({ where: { email } });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.verifyOtp = verifyOtp;
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    const password = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) || '');
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }
    try {
        const user = yield prisma_1.prisma.user.findUnique({ where: { email, role: 'ADMIN' } });
        if (!user || user.password !== password) {
            yield sleep(400);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role }, '8h');
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.adminLogin = adminLogin;
const changeAdminPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const currentPassword = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.currentPassword) || '');
    const newPassword = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.newPassword) || '');
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers' });
    }
    try {
        const user = yield prisma_1.prisma.user.findUnique({ where: { id: adminId } });
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (user.password !== currentPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        yield prisma_1.prisma.user.update({ where: { id: adminId }, data: { password: newPassword } });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.changeAdminPassword = changeAdminPassword;
