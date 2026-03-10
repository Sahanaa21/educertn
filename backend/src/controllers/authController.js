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
exports.adminLogin = exports.verifyOtp = exports.companyLogin = exports.studentLogin = void 0;
const prisma_1 = require("../config/prisma");
const auth_1 = require("../utils/auth");
const email_1 = require("../utils/email");
const studentLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        let user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({
                data: { email, role: 'STUDENT' }
            });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        yield prisma_1.prisma.oTP.create({
            data: {
                email,
                otp,
                expiresAt
            }
        });
        yield (0, email_1.sendEmail)(email, 'Your OTP for Global Academy', `Your OTP is ${otp}. It expires in 10 minutes.`);
        res.json({ message: 'OTP sent to email' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.studentLogin = studentLogin;
const companyLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        let user = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({
                data: { email, role: 'COMPANY' }
            });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        yield prisma_1.prisma.oTP.create({
            data: {
                email,
                otp,
                expiresAt
            }
        });
        yield (0, email_1.sendEmail)(email, 'Your Company OTP for Global Academy Verification', `Your verification OTP is ${otp}. It expires in 10 minutes.`);
        res.json({ message: 'OTP sent to company email' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.companyLogin = companyLogin;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }
    try {
        const validOtp = yield prisma_1.prisma.oTP.findFirst({
            where: { email, otp },
            orderBy: { createdAt: 'desc' }
        });
        if (!validOtp || validOtp.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const user = yield prisma_1.prisma.user.findUnique({ where: { email } });
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
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    try {
        const user = yield prisma_1.prisma.user.findUnique({ where: { email, role: 'ADMIN' } });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.adminLogin = adminLogin;
