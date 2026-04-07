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
exports.getCurrentProfile = exports.completeUnifiedProfile = exports.verifyUnifiedOtp = exports.requestUnifiedOtp = exports.verifyOtp = exports.companyLogin = exports.studentLogin = void 0;
const prisma_1 = require("../config/prisma");
const auth_1 = require("../utils/auth");
const email_1 = require("../utils/email");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRANCH_OPTIONS = new Set([
    'CSE',
    'ISE',
    'ECE',
    'EEE',
    'ME',
    'AIDS',
    'AIML',
    'CSE(AIML)',
    'CIVIL',
    'AERONAUTICAL',
]);
const DEFAULT_ADMIN_ALLOWLIST = String(process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(/[\n,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
const parseAdminAllowlist = (raw) => {
    return String(raw || '')
        .split(/[\n,;]/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => EMAIL_REGEX.test(item));
};
const getAdminAllowlist = () => __awaiter(void 0, void 0, void 0, function* () {
    const allowlist = new Set(DEFAULT_ADMIN_ALLOWLIST);
    try {
        const settings = yield prisma_1.prisma.portalSettings.findUnique({
            where: { id: 1 },
            select: { adminAllowedEmails: true }
        });
        for (const email of parseAdminAllowlist(settings === null || settings === void 0 ? void 0 : settings.adminAllowedEmails)) {
            allowlist.add(email);
        }
    }
    catch (_a) {
        // Fall back to the default allowlist when settings are unavailable.
    }
    return allowlist;
});
const isAllowlistedAdminEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const allowlist = yield getAdminAllowlist();
    return allowlist.has(email.toLowerCase());
});
const getDestinationByRole = (role) => {
    if (role === 'ADMIN')
        return '/admin';
    if (role === 'COMPANY')
        return '/company';
    return '/student';
};
const sendOtpEmail = (normalizedEmail, subject) => __awaiter(void 0, void 0, void 0, function* () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    yield (0, email_1.sendEmail)(normalizedEmail, subject, `<p>Your One-Time Password (OTP) is:</p>
         <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
         <p>This OTP expires in 10 minutes.</p>
         <p>If you did not request this, please ignore this email.</p>`);
    yield prisma_1.prisma.oTP.deleteMany({ where: { email: normalizedEmail } });
    yield prisma_1.prisma.oTP.create({
        data: {
            email: normalizedEmail,
            otp,
            expiresAt
        }
    });
});
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
        // Keep only one active OTP per email to avoid accepting stale codes.
        yield prisma_1.prisma.oTP.deleteMany({ where: { email: normalizedEmail } });
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
        // Keep only one active OTP per email to avoid accepting stale codes.
        yield prisma_1.prisma.oTP.deleteMany({ where: { email: normalizedEmail } });
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
        const latestOtp = yield prisma_1.prisma.oTP.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' }
        });
        if (!latestOtp || latestOtp.expiresAt < new Date() || latestOtp.otp !== otp) {
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
const requestUnifiedOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    const intent = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.intent) || 'login').trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (!['login', 'signup'].includes(intent)) {
        return res.status(400).json({ message: 'Invalid intent' });
    }
    try {
        const existingUser = yield prisma_1.prisma.user.findUnique({ where: { email } });
        const adminEmail = yield isAllowlistedAdminEmail(email);
        if (intent === 'signup' && existingUser) {
            return res.status(409).json({ message: 'This email is already registered. Please login instead.' });
        }
        if (intent === 'login' && !existingUser && !adminEmail) {
            return res.status(404).json({ message: 'Email is not registered. Please sign up first.' });
        }
        yield sendOtpEmail(email, 'Your OTP for Global Academy of Technology');
        return res.json({ message: 'OTP sent successfully' });
    }
    catch (error) {
        console.error('Unified OTP request failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
});
exports.requestUnifiedOtp = requestUnifiedOtp;
const verifyUnifiedOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const latestOtp = yield prisma_1.prisma.oTP.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' }
        });
        if (!latestOtp || latestOtp.expiresAt < new Date() || latestOtp.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        let user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        const adminEmail = yield isAllowlistedAdminEmail(email);
        if (!user && adminEmail) {
            user = yield prisma_1.prisma.user.create({
                data: {
                    email,
                    role: 'ADMIN',
                    name: 'Admin'
                }
            });
        }
        if (!user) {
            yield prisma_1.prisma.oTP.deleteMany({ where: { email } });
            const registrationToken = (0, auth_1.generateToken)({ email, purpose: 'PROFILE_SETUP' }, '20m');
            return res.json({
                requiresRegistration: true,
                registrationToken,
                message: 'OTP verified. Complete profile to continue.'
            });
        }
        if (adminEmail && user.role !== 'ADMIN') {
            user = yield prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' }
            });
        }
        const profileComplete = user.role === 'ADMIN'
            ? true
            : user.role === 'STUDENT'
                ? Boolean(yield prisma_1.prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } }))
                : Boolean(yield prisma_1.prisma.companyProfile.findUnique({ where: { userId: user.id }, select: { id: true } }));
        yield prisma_1.prisma.oTP.deleteMany({ where: { email } });
        if (!profileComplete) {
            const registrationToken = (0, auth_1.generateToken)({ email, userId: user.id, purpose: 'PROFILE_SETUP' }, '20m');
            return res.json({
                requiresRegistration: true,
                role: user.role,
                registrationToken,
                message: 'OTP verified. Complete profile to continue.'
            });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        return res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            destination: getDestinationByRole(user.role),
            message: 'Login successful'
        });
    }
    catch (error) {
        console.error('Unified OTP verify failed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.verifyUnifiedOtp = verifyUnifiedOtp;
const completeUnifiedProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const registrationToken = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.registrationToken) || '');
    const role = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.role) || '').toUpperCase();
    const name = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.name) || '').trim();
    const usn = String(((_d = req.body) === null || _d === void 0 ? void 0 : _d.usn) || '').trim().toUpperCase();
    const branch = String(((_e = req.body) === null || _e === void 0 ? void 0 : _e.branch) || '').trim().toUpperCase();
    const yearOfPassing = String(((_f = req.body) === null || _f === void 0 ? void 0 : _f.yearOfPassing) || '').trim();
    const phoneNumber = String(((_g = req.body) === null || _g === void 0 ? void 0 : _g.phoneNumber) || '').trim();
    const companyName = String(((_h = req.body) === null || _h === void 0 ? void 0 : _h.companyName) || '').trim();
    const contactPerson = String(((_j = req.body) === null || _j === void 0 ? void 0 : _j.contactPerson) || '').trim();
    if (!registrationToken) {
        return res.status(400).json({ message: 'Registration token is required' });
    }
    const decoded = (0, auth_1.verifyToken)(registrationToken);
    if (!decoded || decoded.purpose !== 'PROFILE_SETUP' || !decoded.email) {
        return res.status(401).json({ message: 'Invalid or expired registration token' });
    }
    if (!['STUDENT', 'COMPANY'].includes(role)) {
        return res.status(400).json({ message: 'Select a valid role' });
    }
    if (!name || name.length < 3) {
        return res.status(400).json({ message: 'Enter a valid full name' });
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }
    try {
        let user = yield prisma_1.prisma.user.findUnique({ where: { email: String(decoded.email).toLowerCase() } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({
                data: {
                    email: String(decoded.email).toLowerCase(),
                    name,
                    role: role
                }
            });
        }
        if (yield isAllowlistedAdminEmail(user.email)) {
            return res.status(400).json({ message: 'This email is reserved for admin access only.' });
        }
        if (role === 'STUDENT') {
            if (!usn || usn.length < 6) {
                return res.status(400).json({ message: 'Enter a valid USN' });
            }
            if (!BRANCH_OPTIONS.has(branch)) {
                return res.status(400).json({ message: 'Select a valid branch' });
            }
            if (!/^\d{4}$/.test(yearOfPassing)) {
                return res.status(400).json({ message: 'Enter a valid year of passing' });
            }
            yield prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: 'STUDENT', name } });
            yield prisma_1.prisma.studentProfile.upsert({
                where: { userId: user.id },
                update: { usn, branch, yearOfPassing, phoneNumber },
                create: { userId: user.id, usn, branch, yearOfPassing, phoneNumber }
            });
        }
        if (role === 'COMPANY') {
            if (!companyName || companyName.length < 2) {
                return res.status(400).json({ message: 'Enter a valid company name' });
            }
            if (!contactPerson || contactPerson.length < 2) {
                return res.status(400).json({ message: 'Enter a valid contact person name' });
            }
            yield prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: 'COMPANY', name } });
            yield prisma_1.prisma.companyProfile.upsert({
                where: { userId: user.id },
                update: { companyName, contactPerson, phoneNumber },
                create: { userId: user.id, companyName, contactPerson, phoneNumber }
            });
        }
        const updatedUser = yield prisma_1.prisma.user.findUnique({ where: { id: user.id } });
        const token = (0, auth_1.generateToken)({ id: user.id, role: (updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.role) || role });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name,
                role: (updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.role) || role,
            },
            destination: getDestinationByRole((updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.role) || role),
            message: 'Registration completed successfully'
        });
    }
    catch (error) {
        console.error('Complete profile failed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.completeUnifiedProfile = completeUnifiedProfile;
const getCurrentProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'STUDENT') {
            const studentProfile = yield prisma_1.prisma.studentProfile.findUnique({ where: { userId: user.id } });
            return res.json({ user, studentProfile });
        }
        if (user.role === 'COMPANY') {
            const companyProfile = yield prisma_1.prisma.companyProfile.findUnique({ where: { userId: user.id } });
            return res.json({ user, companyProfile });
        }
        return res.json({ user });
    }
    catch (error) {
        console.error('Get profile failed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getCurrentProfile = getCurrentProfile;
