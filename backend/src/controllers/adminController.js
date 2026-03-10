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
exports.updateVerificationStatus = exports.getAllVerifications = exports.updateCertificateStatus = exports.getAllCertificates = exports.getDashboardStats = void 0;
const prisma_1 = require("../config/prisma");
const email_1 = require("../utils/email");
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalCerts = yield prisma_1.prisma.certificateRequest.count();
        const pendingCerts = yield prisma_1.prisma.certificateRequest.count({ where: { status: 'PENDING' } });
        const processingCerts = yield prisma_1.prisma.certificateRequest.count({ where: { status: 'PROCESSING' } });
        const totalVerifications = yield prisma_1.prisma.verificationRequest.count();
        const pendingVerifs = yield prisma_1.prisma.verificationRequest.count({ where: { status: 'PENDING' } });
        const certsRevenue = yield prisma_1.prisma.certificateRequest.aggregate({
            _sum: { amount: true },
            where: { paymentStatus: 'PAID' }
        });
        const verifsRevenue = yield prisma_1.prisma.verificationRequest.aggregate({
            _sum: { amount: true },
            where: { paymentStatus: 'PAID' }
        });
        const totalRevenue = (certsRevenue._sum.amount || 0) + (verifsRevenue._sum.amount || 0);
        const recentCertificates = yield prisma_1.prisma.certificateRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        const recentVerifications = yield prisma_1.prisma.verificationRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        res.json({
            stats: {
                totalCerts,
                pendingActions: pendingCerts + processingCerts + pendingVerifs,
                totalVerifications,
                totalRevenue
            },
            recentCertificates,
            recentVerifications
        });
    }
    catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getDashboardStats = getDashboardStats;
const getAllCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const certificates = yield prisma_1.prisma.certificateRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true } } }
        });
        res.json(certificates);
    }
    catch (error) {
        console.error('Error fetching all certificates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllCertificates = getAllCertificates;
const updateCertificateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = String(req.params.id);
        const { status, action } = req.body;
        const request = yield prisma_1.prisma.certificateRequest.findUnique({ where: { id }, include: { user: true } });
        if (!request)
            return res.status(404).json({ message: 'Not found' });
        require('fs').appendFileSync('dump.txt', JSON.stringify({
            stage: 'start',
            id,
            reqBody: req.body,
            reqFile: req.file,
            requestCopyType: request.copyType,
            requestEmailed: request.softCopyEmailed,
            requestPosted: request.physicalCopyPosted
        }) + '\n');
        let updateData = {};
        if (status)
            updateData.status = status;
        let finalStatus = status || request.status;
        const copyType = request.copyType;
        let pPosted = request.physicalCopyPosted;
        let sEmailed = request.softCopyEmailed;
        if (action === 'MARK_POSTED') {
            updateData.physicalCopyPosted = true;
            pPosted = true;
        }
        else if (action === 'UPLOAD_SOFT_COPY' || req.file) {
            updateData.softCopyEmailed = true;
            sEmailed = true;
        }
        // Logic to automate status if not manually overridden
        if (['PENDING', 'PROCESSING'].includes(finalStatus)) {
            const softMet = copyType === 'HARD_COPY' || sEmailed;
            const hardMet = copyType === 'SOFT_COPY' || pPosted;
            if (softMet && hardMet) {
                finalStatus = 'COMPLETED';
            }
            else if (sEmailed || pPosted) {
                finalStatus = 'PROCESSING';
            }
            updateData.status = finalStatus;
        }
        const updated = yield prisma_1.prisma.certificateRequest.update({
            where: { id },
            data: updateData,
            include: { user: true }
        });
        // Trigger granular emails
        if ((_a = updated.user) === null || _a === void 0 ? void 0 : _a.email) {
            if ((action === 'UPLOAD_SOFT_COPY' || req.file) && !request.softCopyEmailed) {
                const emailHtml = `
                    <h2>Your Certificate Soft Copy is Ready</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your request for a <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) has been processed.</p>
                    <p>Please find your soft copy document attached to this email.</p>
                    ${updated.copyType === 'BOTH' && !updated.physicalCopyPosted ? '<p>Your physical hard copies are still being processed and will be dispatched shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                let attachments = [];
                if (req.file) {
                    attachments.push({ filename: req.file.originalname, path: req.file.path });
                }
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Soft Copy Delivery', emailHtml, attachments);
            }
            if (action === 'MARK_POSTED' && !request.physicalCopyPosted) {
                const emailHtml = `
                    <h2>Your Certificate Hard Copy Dispatched</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your physical hard copies for <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) have been dispatched to your provided address.</p>
                    ${updated.copyType === 'BOTH' && !updated.softCopyEmailed ? '<p>Your soft copy will be emailed to you shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Hard Copy Dispatched', emailHtml);
            }
            // Generic completion fallback if status manually set to COMPLETED without actions
            if (status === 'COMPLETED' && !action && request.status !== 'COMPLETED') {
                const emailHtml = `
                    <h2>Your Certificate Request is Complete</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your request for a <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) has been manually marked as complete.</p>
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Request Completed', emailHtml);
            }
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating certificate status:', error);
        res.status(500).json({ message: 'Internal server error', error: String(error), stack: error.stack });
    }
});
exports.updateCertificateStatus = updateCertificateStatus;
const getAllVerifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const verifications = yield prisma_1.prisma.verificationRequest.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(verifications);
    }
    catch (error) {
        console.error('Error fetching all verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllVerifications = getAllVerifications;
const updateVerificationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const { status } = req.body;
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: { status }
        });
        if (status === 'COMPLETED' && updated.companyEmail) {
            const emailHtml = `
                <h2>Verification Request Complete</h2>
                <p>Hello ${updated.contactPerson},</p>
                <p>Your verification request for <strong>${updated.studentName}</strong> (Request ID: ${updated.id}) has been successfully completed.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            yield (0, email_1.sendEmail)(updated.companyEmail, 'Verification Request Completed', emailHtml);
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateVerificationStatus = updateVerificationStatus;
