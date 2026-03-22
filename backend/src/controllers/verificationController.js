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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelCompanyVerificationRequest = exports.completeVerificationRequest = exports.downloadCompanyCompletedFile = exports.getCompanyVerifications = exports.createVerificationPaymentOrder = exports.verifyVerificationPayment = exports.createVerificationRequest = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../config/prisma");
const razorpay_1 = require("../config/razorpay");
const generateId_1 = require("../utils/generateId");
const VERIFICATION_FEE = 5000;
const resolveStoredFilePath = (storedPath) => {
    if (!storedPath)
        return null;
    const direct = path_1.default.isAbsolute(storedPath) ? storedPath : path_1.default.resolve(process.cwd(), storedPath);
    if (fs_1.default.existsSync(direct))
        return direct;
    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1); // "uploads/..."
        const candidate = path_1.default.resolve(process.cwd(), relativeFromUploads);
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    const fallbackByName = path_1.default.resolve(process.cwd(), 'uploads', path_1.default.basename(normalized));
    if (fs_1.default.existsSync(fallbackByName))
        return fallbackByName;
    return null;
};
const inferExtensionFromFile = (filePath) => {
    try {
        const buffer = fs_1.default.readFileSync(filePath).subarray(0, 8192);
        if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
            return '.pdf';
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A)
            return '.png';
        if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF)
            return '.jpg';
        if (buffer.length >= 8 &&
            buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
            buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1)
            return '.doc';
        if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
            const snippet = buffer.toString('utf8');
            if (snippet.includes('word/') || snippet.includes('[Content_Types].xml'))
                return '.docx';
            return '.zip';
        }
    }
    catch (_a) {
        return '';
    }
    return '';
};
const getAuthenticatedCompanyEmail = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return null;
    const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!user || user.role !== 'COMPANY')
        return null;
    return user.email;
});
const createVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authEmail = yield getAuthenticatedCompanyEmail(req);
        if (!authEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { companyName, contactPerson, phone, studentName, usn } = req.body;
        const templateFile = req.file;
        if (!companyName || !contactPerson || !studentName || !usn) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (phone && !/^\d{10}$/.test(String(phone))) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }
        if (!templateFile) {
            return res.status(400).json({ message: 'Verification template file is required' });
        }
        const requestId = yield (0, generateId_1.generateVerificationRequestId)();
        const created = yield prisma_1.prisma.verificationRequest.create({
            data: {
                requestId,
                companyName,
                companyEmail: authEmail,
                contactPerson,
                phone: phone || null,
                studentName,
                usn,
                uploadedTemplate: templateFile.path,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });
        if (!(0, razorpay_1.hasRazorpayConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, razorpay_1.createRazorpayOrder)({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${requestId}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'VERIFICATION',
                requestId: created.id,
                companyEmail: authEmail
            }
        });
        yield prisma_1.prisma.verificationRequest.update({
            where: { id: created.id },
            data: { paymentOrderId: order.id }
        });
        res.status(201).json({
            request: created,
            amount: VERIFICATION_FEE,
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: (0, razorpay_1.getRazorpayKeyId)(),
                name: 'Global Academy of Technology',
                description: `Verification Request ${requestId}`
            }
        });
    }
    catch (error) {
        console.error('Error creating verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createVerificationRequest = createVerificationRequest;
const verifyVerificationPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const id = String(req.params.id || '');
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!id || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Payment verification details are required' });
        }
        const request = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true, status: true }
        });
        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }
        const valid = (0, razorpay_1.verifyRazorpaySignature)({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature
        });
        if (!valid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }
        const order = yield (0, razorpay_1.fetchRazorpayOrder)(razorpayOrderId);
        const orderRequestId = String(((_a = order.notes) === null || _a === void 0 ? void 0 : _a.requestId) || '');
        const orderReceipt = String(order.receipt || '');
        if (orderRequestId !== id && !orderReceipt.startsWith(`ver-${request.requestId}`)) {
            return res.status(400).json({ message: 'Payment order does not match this request' });
        }
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: razorpayOrderId
            }
        });
        return res.json({ message: 'Payment verified successfully', request: updated });
    }
    catch (error) {
        console.error('Error verifying verification payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.verifyVerificationPayment = verifyVerificationPayment;
const createVerificationPaymentOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const id = String(req.params.id || '');
        if (!id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const request = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true, status: true }
        });
        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }
        if (request.status === 'REJECTED') {
            return res.status(400).json({ message: 'Payment is not allowed for rejected requests' });
        }
        if (!(0, razorpay_1.hasRazorpayConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, razorpay_1.createRazorpayOrder)({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${request.requestId}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'VERIFICATION',
                requestId: request.id,
                companyEmail
            }
        });
        yield prisma_1.prisma.verificationRequest.update({
            where: { id: request.id },
            data: { paymentOrderId: order.id }
        });
        return res.json({
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: (0, razorpay_1.getRazorpayKeyId)(),
                name: 'Global Academy of Technology',
                description: `Verification Request ${request.requestId}`
            }
        });
    }
    catch (error) {
        console.error('Error creating verification retry payment order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createVerificationPaymentOrder = createVerificationPaymentOrder;
const getCompanyVerifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const requests = yield prisma_1.prisma.verificationRequest.findMany({
            where: { companyEmail },
            orderBy: { createdAt: 'desc' },
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching company verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCompanyVerifications = getCompanyVerifications;
const downloadCompanyCompletedFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const id = String(req.params.id);
        const request = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: { requestId: true, companyEmail: true, completedFile: true, status: true }
        });
        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const resolvedCompletedFilePath = resolveStoredFilePath(request.completedFile);
        if (request.status !== 'COMPLETED' || !resolvedCompletedFilePath) {
            return res.status(400).json({ message: 'Completed response file not available yet' });
        }
        const extension = path_1.default.extname(resolvedCompletedFilePath || '') || inferExtensionFromFile(resolvedCompletedFilePath) || '';
        return res.download(resolvedCompletedFilePath, `${request.requestId}-completed-file${extension}`);
    }
    catch (error) {
        console.error('Error downloading completed verification file:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.downloadCompanyCompletedFile = downloadCompanyCompletedFile;
const completeVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });
        // TODO: Send completion email here
        res.json(updated);
    }
    catch (error) {
        console.error('Error completing verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeVerificationRequest = completeVerificationRequest;
const cancelCompanyVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const id = String(req.params.id || '');
        if (!id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const existing = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: {
                id: true,
                companyEmail: true,
                status: true,
                paymentStatus: true,
                paymentOrderId: true,
                completedFile: true
            }
        });
        if (!existing || existing.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Verification request not found' });
        }
        if (existing.status !== 'PENDING') {
            return res.status(400).json({ message: 'Cancellation is allowed only while request is pending' });
        }
        if (Boolean(existing.completedFile)) {
            return res.status(400).json({ message: 'Cannot cancel after processed documents are uploaded' });
        }
        let nextPaymentStatus = existing.paymentStatus;
        if (existing.paymentStatus === 'PAID') {
            if (!(0, razorpay_1.hasRazorpayConfig)()) {
                return res.status(500).json({ message: 'Cannot process refund: payment gateway is not configured' });
            }
            if (!existing.paymentOrderId) {
                return res.status(400).json({ message: 'Cannot process refund: missing payment order reference' });
            }
            const payment = yield (0, razorpay_1.fetchLatestCapturedPaymentForOrder)(existing.paymentOrderId);
            if (!(payment === null || payment === void 0 ? void 0 : payment.id)) {
                return res.status(400).json({ message: 'Cannot process refund: captured payment not found for this request' });
            }
            const paidAmount = Number(payment.amount || 0);
            const alreadyRefunded = Number(payment.amount_refunded || 0);
            const refundableAmount = Math.min(VERIFICATION_FEE * 100, paidAmount);
            if (alreadyRefunded < refundableAmount) {
                yield (0, razorpay_1.createRazorpayRefund)(payment.id, refundableAmount);
            }
            nextPaymentStatus = 'REFUNDED';
        }
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: 'Cancelled by company before processing',
                paymentStatus: nextPaymentStatus
            }
        });
        return res.json({
            message: nextPaymentStatus === 'REFUNDED'
                ? 'Request cancelled and refund initiated'
                : 'Request cancelled successfully',
            request: updated
        });
    }
    catch (error) {
        console.error('Error cancelling verification request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.cancelCompanyVerificationRequest = cancelCompanyVerificationRequest;
