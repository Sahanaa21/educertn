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
exports.updateAcademicServiceSettingsAdmin = exports.getAcademicServiceSettingsAdmin = exports.uploadAcademicServiceAttachments = exports.updateAcademicServiceRequest = exports.getAllAcademicServiceRequests = exports.getStudentAcademicServiceRequests = exports.createAcademicServicePaymentOrder = exports.verifyAcademicServicePayment = exports.createAcademicServiceRequest = exports.getAcademicServicesAvailabilityStudent = exports.getAcademicServicesAvailabilityPublic = void 0;
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../config/prisma");
const razorpay_1 = require("../config/razorpay");
const PHOTOCOPY_FEE = 500;
const REEVALUATION_FEE = 3000;
const FIXED_ADMIN_ALLOWLIST = 'sahanaa2060@gmail.com';
const getSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.portalSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            supportEmail: 'support@gat.ac.in',
            frontendUrl: process.env.FRONTEND_URL || 'https://gat-verification-portal.vercel.app',
            maintenanceMode: false,
            allowCompanySignup: true,
            smtpFromName: 'Global Academy of Technology',
            adminAllowedEmails: FIXED_ADMIN_ALLOWLIST,
            academicServicesEnabled: false,
            academicServicesStartAt: null,
            academicServicesEndAt: null,
        }
    });
});
const getAcademicWindowState = () => __awaiter(void 0, void 0, void 0, function* () {
    const settings = yield getSettings();
    const now = new Date();
    const start = settings.academicServicesStartAt ? new Date(settings.academicServicesStartAt) : null;
    const end = settings.academicServicesEndAt ? new Date(settings.academicServicesEndAt) : null;
    const activeByTime = (!start || now >= start) && (!end || now <= end);
    const active = Boolean(settings.academicServicesEnabled && activeByTime);
    return {
        settings,
        active,
        now,
        start,
        end,
    };
});
const sanitizeCourseNames = (raw) => {
    if (!raw)
        return [];
    let list = [];
    if (Array.isArray(raw)) {
        list = raw;
    }
    else if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                list = parsed;
            }
        }
        catch (_a) {
            list = raw.split(',');
        }
    }
    return list
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};
const getRequestAmount = (serviceType, courseCount) => {
    const unit = serviceType === 'PHOTOCOPY' ? PHOTOCOPY_FEE : REEVALUATION_FEE;
    return unit * courseCount;
};
const generateServiceRequestId = (serviceType) => {
    const prefix = serviceType === 'PHOTOCOPY' ? 'PC' : 'RV';
    const stamp = Date.now().toString().slice(-8);
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}${stamp}${rand}`;
};
const getAcademicServicesAvailabilityPublic = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { active, start, end, settings } = yield getAcademicWindowState();
        return res.json({
            active,
            enabled: Boolean(settings.academicServicesEnabled),
            startAt: start,
            endAt: end,
        });
    }
    catch (error) {
        console.error('Failed to get academic service availability:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAcademicServicesAvailabilityPublic = getAcademicServicesAvailabilityPublic;
const getAcademicServicesAvailabilityStudent = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.getAcademicServicesAvailabilityPublic)(_req, res);
});
exports.getAcademicServicesAvailabilityStudent = getAcademicServicesAvailabilityStudent;
const createAcademicServiceRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (!user || user.role !== 'STUDENT') {
            return res.status(403).json({ message: 'Only currently studying students can apply for this service' });
        }
        const { active, start, end } = yield getAcademicWindowState();
        if (!active) {
            return res.status(400).json({
                message: 'This service is currently closed',
                startAt: start,
                endAt: end,
            });
        }
        const serviceType = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.serviceType) || '').toUpperCase();
        const semester = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.semester) || '').trim();
        const courseCount = Number(((_d = req.body) === null || _d === void 0 ? void 0 : _d.courseCount) || 0);
        const courseNames = sanitizeCourseNames((_e = req.body) === null || _e === void 0 ? void 0 : _e.courseNames);
        if (!['PHOTOCOPY', 'REEVALUATION'].includes(serviceType)) {
            return res.status(400).json({ message: 'Invalid service type' });
        }
        if (!semester) {
            return res.status(400).json({ message: 'Semester is required' });
        }
        if (!Number.isInteger(courseCount) || courseCount < 1 || courseCount > 7) {
            return res.status(400).json({ message: 'Number of courses must be between 1 and 7' });
        }
        if (courseNames.length !== courseCount) {
            return res.status(400).json({ message: 'Please provide course names for all selected courses' });
        }
        const amount = getRequestAmount(serviceType, courseCount);
        const requestId = generateServiceRequestId(serviceType);
        const created = yield prisma_1.prisma.academicServiceRequest.create({
            data: {
                requestId,
                userId,
                serviceType,
                semester,
                courseCount,
                courseNames,
                amount,
                paymentStatus: 'PENDING',
                status: 'PENDING',
            }
        });
        if (!(0, razorpay_1.hasRazorpayConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const order = yield (0, razorpay_1.createRazorpayOrder)({
            amountPaise: Math.round(amount * 100),
            receipt: `svc-${requestId}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'ACADEMIC_SERVICE',
                requestId: created.id,
                serviceType,
                userId,
            }
        });
        const updated = yield prisma_1.prisma.academicServiceRequest.update({
            where: { id: created.id },
            data: { paymentOrderId: order.id }
        });
        return res.status(201).json({
            request: updated,
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: (0, razorpay_1.getRazorpayKeyId)(),
                name: 'Global Academy of Technology',
                description: `${serviceType} Request ${requestId}`,
            }
        });
    }
    catch (error) {
        console.error('Failed to create academic service request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createAcademicServiceRequest = createAcademicServiceRequest;
const verifyAcademicServicePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const id = String(req.params.id || '');
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!userId || !id || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Invalid request payload' });
        }
        const request = yield prisma_1.prisma.academicServiceRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, requestId: true, paymentStatus: true, paymentOrderId: true }
        });
        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }
        if (request.paymentOrderId && request.paymentOrderId !== razorpayOrderId) {
            return res.status(400).json({ message: 'Order mismatch for this request' });
        }
        const valid = (0, razorpay_1.verifyRazorpaySignature)({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
        });
        if (!valid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }
        const order = yield (0, razorpay_1.fetchRazorpayOrder)(razorpayOrderId);
        const noteId = String(((_b = order.notes) === null || _b === void 0 ? void 0 : _b.requestId) || '');
        const receipt = String(order.receipt || '');
        if (noteId !== id && !receipt.includes(request.requestId)) {
            return res.status(400).json({ message: 'Payment order does not match this request' });
        }
        const updated = yield prisma_1.prisma.academicServiceRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: razorpayOrderId,
            }
        });
        return res.json({ message: 'Payment verified successfully', request: updated });
    }
    catch (error) {
        console.error('Failed to verify academic service payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.verifyAcademicServicePayment = verifyAcademicServicePayment;
const createAcademicServicePaymentOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const id = String(req.params.id || '');
        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const request = yield prisma_1.prisma.academicServiceRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, userId: true, amount: true, paymentStatus: true, status: true, serviceType: true }
        });
        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }
        if (!(0, razorpay_1.hasRazorpayConfig)()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }
        const amountPaise = Math.round(Number(request.amount || 0) * 100);
        if (amountPaise <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }
        const order = yield (0, razorpay_1.createRazorpayOrder)({
            amountPaise,
            receipt: `svc-${request.requestId}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'ACADEMIC_SERVICE',
                requestId: request.id,
                serviceType: request.serviceType,
                userId,
            }
        });
        yield prisma_1.prisma.academicServiceRequest.update({
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
                description: `${request.serviceType} Request ${request.requestId}`
            }
        });
    }
    catch (error) {
        console.error('Failed to create payment order for academic service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createAcademicServicePaymentOrder = createAcademicServicePaymentOrder;
const getStudentAcademicServiceRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const requests = yield prisma_1.prisma.academicServiceRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(requests);
    }
    catch (error) {
        console.error('Failed to fetch student academic service requests:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStudentAcademicServiceRequests = getStudentAcademicServiceRequests;
const getAllAcademicServiceRequests = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield prisma_1.prisma.academicServiceRequest.findMany({
            include: {
                user: { select: { email: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(requests);
    }
    catch (error) {
        console.error('Failed to fetch admin academic service requests:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllAcademicServiceRequests = getAllAcademicServiceRequests;
const updateAcademicServiceRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id || '');
        const { status, adminRemarks, resultSummary, action } = req.body;
        const existing = yield prisma_1.prisma.academicServiceRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (action === 'MARK_REFUND_COMPLETED') {
            const updated = yield prisma_1.prisma.academicServiceRequest.update({
                where: { id },
                data: { paymentStatus: 'REFUND_COMPLETED' }
            });
            return res.json(updated);
        }
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const data = {
            status,
            adminRemarks: typeof adminRemarks === 'string' ? adminRemarks.trim() : existing.adminRemarks,
            resultSummary: typeof resultSummary === 'string' ? resultSummary.trim() : existing.resultSummary,
        };
        if (status === 'REJECTED' && existing.paymentStatus === 'PAID') {
            data.paymentStatus = 'REFUND_INITIATED';
        }
        const updated = yield prisma_1.prisma.academicServiceRequest.update({
            where: { id },
            data,
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Failed to update academic service request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateAcademicServiceRequest = updateAcademicServiceRequest;
const uploadAcademicServiceAttachments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id || '');
        const files = (req.files || []);
        if (!id || files.length === 0) {
            return res.status(400).json({ message: 'Files are required' });
        }
        const existing = yield prisma_1.prisma.academicServiceRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const prev = Array.isArray(existing.attachmentUrls) ? existing.attachmentUrls : [];
        const newUrls = files.map((file) => `/uploads/${path_1.default.basename(file.path)}`);
        const merged = [...prev, ...newUrls];
        const updated = yield prisma_1.prisma.academicServiceRequest.update({
            where: { id },
            data: {
                attachmentUrls: merged,
                status: existing.status === 'PENDING' ? 'UNDER_REVIEW' : existing.status,
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Failed to upload academic service attachments:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.uploadAcademicServiceAttachments = uploadAcademicServiceAttachments;
const getAcademicServiceSettingsAdmin = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield getSettings();
        return res.json({
            academicServicesEnabled: Boolean(settings.academicServicesEnabled),
            academicServicesStartAt: settings.academicServicesStartAt,
            academicServicesEndAt: settings.academicServicesEndAt,
            adminAllowedEmails: String(settings.adminAllowedEmails || ''),
        });
    }
    catch (error) {
        console.error('Failed to fetch academic service settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAcademicServiceSettingsAdmin = getAcademicServiceSettingsAdmin;
const updateAcademicServiceSettingsAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { academicServicesEnabled, academicServicesStartAt, academicServicesEndAt, } = req.body;
        const start = academicServicesStartAt ? new Date(academicServicesStartAt) : null;
        const end = academicServicesEndAt ? new Date(academicServicesEndAt) : null;
        if (start && Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid start date' });
        }
        if (end && Number.isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid end date' });
        }
        if (start && end && start > end) {
            return res.status(400).json({ message: 'Start date must be before end date' });
        }
        const updated = yield prisma_1.prisma.portalSettings.upsert({
            where: { id: 1 },
            update: {
                academicServicesEnabled: Boolean(academicServicesEnabled),
                academicServicesStartAt: start,
                academicServicesEndAt: end,
                adminAllowedEmails: FIXED_ADMIN_ALLOWLIST,
            },
            create: {
                id: 1,
                supportEmail: 'support@gat.ac.in',
                frontendUrl: process.env.FRONTEND_URL || 'https://gat-verification-portal.vercel.app',
                maintenanceMode: false,
                allowCompanySignup: true,
                smtpFromName: 'Global Academy of Technology',
                adminAllowedEmails: FIXED_ADMIN_ALLOWLIST,
                academicServicesEnabled: Boolean(academicServicesEnabled),
                academicServicesStartAt: start,
                academicServicesEndAt: end,
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Failed to update academic service settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateAcademicServiceSettingsAdmin = updateAcademicServiceSettingsAdmin;
