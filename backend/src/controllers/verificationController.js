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
const email_1 = require("../utils/email");
const zwitch_1 = require("../config/zwitch");
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
        if (!(0, zwitch_1.hasZwitchConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, zwitch_1.createZwitchOrder)({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${requestId}-${Date.now()}`.slice(0, 40),
            description: `Verification Request ${requestId}`,
            notes: {
                requestType: 'VERIFICATION',
                requestId: created.id,
                companyEmail: authEmail
            }
        });
        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }
        yield prisma_1.prisma.verificationRequest.update({
            where: { id: created.id },
            data: { paymentOrderId: order.id }
        });
        res.status(201).json({
            request: created,
            amount: VERIFICATION_FEE,
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Verification Request ${requestId}`,
                checkoutUrl: order.checkoutUrl
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
    try {
        const companyEmail = yield getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const id = String(req.params.id || '');
        const { zwitchOrderId } = req.body;
        if (!id) {
            return res.status(400).json({ message: 'Payment verification details are required' });
        }
        const request = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true, status: true, paymentOrderId: true }
        });
        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }
        const orderId = String(zwitchOrderId || request.paymentOrderId || '').trim();
        if (!orderId) {
            return res.status(400).json({ message: 'Payment order id is required for verification' });
        }
        if (request.paymentOrderId && request.paymentOrderId !== orderId) {
            return res.status(400).json({ message: 'Order ID mismatch for this request' });
        }
        const order = yield (0, zwitch_1.fetchZwitchOrder)(orderId);
        if (!(0, zwitch_1.isZwitchOrderPaid)(order)) {
            return res.status(400).json({ message: 'Payment is not completed yet' });
        }
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: orderId
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
        if (!(0, zwitch_1.hasZwitchConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, zwitch_1.createZwitchOrder)({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${request.requestId}-${Date.now()}`.slice(0, 40),
            description: `Verification Request ${request.requestId}`,
            notes: {
                requestType: 'VERIFICATION',
                requestId: request.id,
                companyEmail
            }
        });
        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }
        yield prisma_1.prisma.verificationRequest.update({
            where: { id: request.id },
            data: { paymentOrderId: order.id }
        });
        return res.json({
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Verification Request ${request.requestId}`,
                checkoutUrl: order.checkoutUrl
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
        if (updated.companyEmail) {
            const emailHtml = `
                <h2>Verification Request Completed</h2>
                <p>Hello ${updated.contactPerson || 'there'},</p>
                <p>Your verification request <strong>${updated.requestId}</strong> has been marked as complete.</p>
                <p>You can now download the completed response from the portal if it is available.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            const attachments = updated.completedFile
                ? [{
                        filename: `${updated.requestId}-completed-file${path_1.default.extname(updated.completedFile || '') || ''}`,
                        path: updated.completedFile
                    }]
                : undefined;
            void (0, email_1.sendEmail)(updated.companyEmail, 'Verification Completed – Global Academy of Technology', emailHtml, attachments).catch((emailErr) => {
                console.error('Failed to send verification completion email:', emailErr);
            });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error completing verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeVerificationRequest = completeVerificationRequest;
const cancelCompanyVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(403).json({
        message: 'Cancellation is disabled. Please contact the college office for any corrections or refund requests.'
    });
});
exports.cancelCompanyVerificationRequest = cancelCompanyVerificationRequest;
