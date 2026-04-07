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
exports.cancelStudentCertificateRequest = exports.downloadStudentIssuedCertificate = exports.completeCertificateRequest = exports.getStudentRequests = exports.createCertificatePaymentOrder = exports.verifyCertificatePayment = exports.createCertificateRequest = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../config/prisma");
const email_1 = require("../utils/email");
const zwitch_1 = require("../config/zwitch");
const generateId_1 = require("../utils/generateId");
const resolveStoredFilePath = (storedPath) => {
    if (!storedPath)
        return null;
    const direct = path_1.default.isAbsolute(storedPath) ? storedPath : path_1.default.resolve(process.cwd(), storedPath);
    if (fs_1.default.existsSync(direct))
        return direct;
    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1);
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
        if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            return '.pdf';
        }
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
            return '.png';
        }
        if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return '.jpg';
        }
        if (buffer.length >= 8 &&
            buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
            buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) {
            return '.doc';
        }
        if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
            const snippet = buffer.toString('utf8');
            if (snippet.includes('word/') || snippet.includes('[Content_Types].xml')) {
                return '.docx';
            }
            return '.zip';
        }
    }
    catch (_a) {
        return '';
    }
    return '';
};
const createCertificateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const file = req.file;
        // In a real app you would upload this to Cloudinary. For now, we mock the URL.
        const idProofUrl = file ? `/uploads/${file.filename}` : undefined;
        const body = req.body;
        const usn = body.usn;
        const studentName = body.studentName;
        const branch = body.branch;
        const yearOfPassing = body.yearOfPassing;
        const phoneNumber = body.phoneNumber || undefined;
        const certificateType = body.certificateType;
        const copyType = body.copyType;
        const copies = 1;
        const reason = body.reason || undefined;
        const address = body.address || undefined;
        const amount = Number(body.amount) || 0;
        if (!usn || !studentName || !branch || !yearOfPassing || !phoneNumber || !certificateType || !copyType) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (!/^\d{10}$/.test(String(phoneNumber))) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }
        const parsedYear = Number(yearOfPassing);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > currentYear + 1) {
            return res.status(400).json({ message: 'Enter a valid year of passing (2000 or later)' });
        }
        if ((copyType === 'HARD_COPY' || copyType === 'BOTH') && !String(address || '').trim()) {
            return res.status(400).json({ message: 'Postal address is required for hard copy delivery' });
        }
        if (!String(reason || '').trim()) {
            return res.status(400).json({ message: 'Reason for request is required' });
        }
        if (!file) {
            return res.status(400).json({ message: 'Government ID proof is required' });
        }
        const id = yield (0, generateId_1.generateRequestId)();
        const certificateRequest = yield prisma_1.prisma.certificateRequest.create({
            data: {
                id,
                userId,
                usn,
                studentName,
                branch,
                yearOfPassing,
                phoneNumber,
                certificateType,
                copyType,
                copies,
                reason,
                address,
                idProofUrl,
                amount,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });
        if (!(0, zwitch_1.hasZwitchConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, zwitch_1.createZwitchOrder)({
            amountPaise: Math.round(amount * 100),
            receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
            description: `Certificate Request ${id}`,
            notes: {
                requestType: 'CERTIFICATE',
                requestId: id,
                userId: String(userId)
            }
        });
        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }
        yield prisma_1.prisma.certificateRequest.update({
            where: { id: certificateRequest.id },
            data: { paymentOrderId: order.id }
        });
        res.status(201).json({
            request: certificateRequest,
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Certificate Request ${id}`,
                checkoutUrl: order.checkoutUrl
            }
        });
    }
    catch (error) {
        console.error('Error creating certificate request:', error);
        res.status(500).json({ message: error.message || 'Internal server error', details: error });
    }
});
exports.createCertificateRequest = createCertificateRequest;
const verifyCertificatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const id = String(req.params.id || '');
        const { zwitchOrderId } = req.body;
        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const request = yield prisma_1.prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, paymentStatus: true, paymentOrderId: true }
        });
        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
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
        const updated = yield prisma_1.prisma.certificateRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: orderId
            }
        });
        return res.json({ message: 'Payment verified successfully', request: updated });
    }
    catch (error) {
        console.error('Error verifying certificate payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.verifyCertificatePayment = verifyCertificatePayment;
const createCertificatePaymentOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const id = String(req.params.id || '');
        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const request = yield prisma_1.prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, amount: true, paymentStatus: true, status: true }
        });
        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
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
        const amountPaise = Math.round(Number(request.amount || 0) * 100);
        if (amountPaise <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount for this request' });
        }
        const order = yield (0, zwitch_1.createZwitchOrder)({
            amountPaise,
            receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
            description: `Certificate Request ${id}`,
            notes: {
                requestType: 'CERTIFICATE',
                requestId: id,
                userId
            }
        });
        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }
        yield prisma_1.prisma.certificateRequest.update({
            where: { id },
            data: { paymentOrderId: order.id }
        });
        return res.json({
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Certificate Request ${id}`,
                checkoutUrl: order.checkoutUrl
            }
        });
    }
    catch (error) {
        console.error('Error creating certificate retry payment order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createCertificatePaymentOrder = createCertificatePaymentOrder;
const getStudentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const requests = yield prisma_1.prisma.certificateRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching student requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStudentRequests = getStudentRequests;
const completeCertificateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const updated = yield prisma_1.prisma.certificateRequest.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: { user: true }
        });
        if (updated.user?.email) {
            const emailHtml = `
                <h2>Your Certificate Request is Complete</h2>
                <p>Hello ${updated.studentName},</p>
                <p>Your request for <strong>${String(updated.certificateType || '').replace('_', ' ')}</strong> (Request ID: ${updated.id}) has been marked as complete.</p>
                <p>You can now download your issued certificate from the portal if it is available.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            void (0, email_1.sendEmail)(updated.user.email, 'Certificate Request Completed', emailHtml).catch((emailErr) => {
                console.error('Failed to send certificate completion email:', emailErr);
            });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error completing request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeCertificateRequest = completeCertificateRequest;
const downloadStudentIssuedCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const id = String(req.params.id || '');
        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const request = yield prisma_1.prisma.certificateRequest.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                copyType: true,
                issuedCertificateUrl: true
            }
        });
        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }
        if (request.copyType === 'HARD_COPY') {
            return res.status(400).json({ message: 'Soft copy is not available for this request' });
        }
        const resolvedFilePath = resolveStoredFilePath(request.issuedCertificateUrl);
        if (!resolvedFilePath) {
            return res.status(404).json({ message: 'Certificate file not found. Please contact admin.' });
        }
        const extension = path_1.default.extname(resolvedFilePath || '') || inferExtensionFromFile(resolvedFilePath) || '';
        return res.download(resolvedFilePath, `${request.id}-certificate${extension}`);
    }
    catch (error) {
        console.error('Error downloading issued certificate:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.downloadStudentIssuedCertificate = downloadStudentIssuedCertificate;
const cancelStudentCertificateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(403).json({
        message: 'Cancellation is disabled. Please contact the college office for any corrections or refund requests.'
    });
});
exports.cancelStudentCertificateRequest = cancelStudentCertificateRequest;
