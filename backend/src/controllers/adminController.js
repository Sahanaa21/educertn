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
exports.uploadVerificationCompletedFile = exports.downloadCertificateIdProof = exports.downloadVerificationTemplate = exports.updateVerificationStatus = exports.getAllVerifications = exports.updateCertificateStatus = exports.getAllCertificates = exports.getDashboardStats = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../config/prisma");
const email_1 = require("../utils/email");
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
            _count: { id: true },
            where: { paymentStatus: 'PAID' }
        });
        const verificationRevenue = (verifsRevenue._count.id || 0) * 5000;
        const totalRevenue = (certsRevenue._sum.amount || 0) + verificationRevenue;
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
    var _a, _b;
    try {
        const id = String(req.params.id);
        const { status, action, rejectionReason } = req.body;
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
        let refundMarkedInitiated = false;
        if (action === 'MARK_REFUND_COMPLETED') {
            const updated = yield prisma_1.prisma.certificateRequest.update({
                where: { id },
                data: { paymentStatus: 'REFUND_COMPLETED' },
                include: { user: true }
            });
            return res.json(updated);
        }
        if (status === 'REJECTED' && request.status !== 'REJECTED' && request.paymentStatus === 'PAID') {
            updateData.paymentStatus = 'REFUND_INITIATED';
            refundMarkedInitiated = true;
        }
        if (status)
            updateData.status = status;
        if (status === 'REJECTED' && rejectionReason)
            updateData.rejectionReason = rejectionReason;
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
            if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.filename) {
                updateData.issuedCertificateUrl = `/uploads/${req.file.filename}`;
            }
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
        if ((_b = updated.user) === null || _b === void 0 ? void 0 : _b.email) {
            if (status === 'REJECTED' && request.status !== 'REJECTED') {
                const safeReason = String(rejectionReason || updated.rejectionReason || '').trim();
                const emailHtml = `
                    <h2>Your Certificate Request Was Rejected</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your request for <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) was rejected by the admin team.</p>
                    <p><strong>Reason:</strong> ${safeReason || 'No reason was provided.'}</p>
                    ${refundMarkedInitiated ? '<p><strong>Refund:</strong> Refund has been initiated. It may take 5-7 working days. You will be updated once completed.</p>' : ''}
                    <p>Please review the reason and submit a corrected request if needed.</p>
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                void (0, email_1.sendEmail)(updated.user.email, 'Certificate Request Rejected', emailHtml).catch((emailErr) => {
                    console.error('Failed to send certificate rejection email:', emailErr);
                });
            }
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
    var _a;
    try {
        const id = String(req.params.id);
        const { status, rejectionReason, action } = req.body;
        if (action === 'MARK_REFUND_COMPLETED') {
            const updated = yield prisma_1.prisma.verificationRequest.update({
                where: { id },
                data: { paymentStatus: 'REFUND_COMPLETED' }
            });
            return res.json(updated);
        }
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const existing = yield prisma_1.prisma.verificationRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Verification request not found' });
        }
        let refundMarkedInitiated = false;
        if (status === 'REJECTED' && existing.status !== 'REJECTED' && existing.paymentStatus === 'PAID') {
            refundMarkedInitiated = true;
        }
        if (status === 'COMPLETED' && (!existing.completedFile || !fs_1.default.existsSync(existing.completedFile))) {
            return res.status(400).json({ message: 'Upload completed file before marking as completed' });
        }
        let updated;
        try {
            updated = (yield prisma_1.prisma.verificationRequest.update({
                where: { id },
                data: Object.assign(Object.assign({ status }, (refundMarkedInitiated ? { paymentStatus: 'REFUND_INITIATED' } : {})), (status === 'REJECTED' && rejectionReason ? { rejectionReason } : {}))
            }));
        }
        catch (updateErr) {
            // Fallback: column may not exist yet in DB, retry without rejectionReason
            if (((_a = updateErr === null || updateErr === void 0 ? void 0 : updateErr.message) === null || _a === void 0 ? void 0 : _a.includes('rejectionReason')) || (updateErr === null || updateErr === void 0 ? void 0 : updateErr.code) === 'P2009') {
                updated = (yield prisma_1.prisma.verificationRequest.update({ where: { id }, data: { status } }));
            }
            else {
                throw updateErr;
            }
        }
        if (status === 'COMPLETED' && updated.companyEmail) {
            const emailHtml = `
                <h2>Verification Completed</h2>
                <p>Hello ${updated.contactPerson},</p>
                <p>Your verification request has been completed.</p>
                <p><strong>Student Name:</strong> ${updated.studentName}</p>
                <p><strong>USN:</strong> ${updated.usn}</p>
                <p><strong>Request ID:</strong> ${updated.requestId}</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            const attachments = updated.completedFile
                ? [{
                        filename: `${updated.requestId}-completed-file${path_1.default.extname(updated.completedFile || '') || ''}`,
                        path: updated.completedFile
                    }]
                : undefined;
            yield (0, email_1.sendEmail)(updated.companyEmail, 'Verification Completed – Global Academy of Technology', emailHtml, attachments);
        }
        if (status === 'REJECTED' && existing.status !== 'REJECTED' && updated.companyEmail) {
            const safeReason = String(rejectionReason || updated.rejectionReason || '').trim();
            const emailHtml = `
                <h2>Verification Request Rejected</h2>
                <p>Hello ${updated.contactPerson},</p>
                <p>Your verification request was rejected by the admin team.</p>
                <p><strong>Student Name:</strong> ${updated.studentName}</p>
                <p><strong>USN:</strong> ${updated.usn}</p>
                <p><strong>Request ID:</strong> ${updated.requestId}</p>
                <p><strong>Reason:</strong> ${safeReason || 'No reason was provided.'}</p>
                ${refundMarkedInitiated ? '<p><strong>Refund:</strong> Refund has been initiated. It may take 5-7 working days. You will be updated once completed.</p>' : ''}
                <p>Please correct the details and resubmit if required.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            void (0, email_1.sendEmail)(updated.companyEmail, 'Verification Rejected – Global Academy of Technology', emailHtml).catch((emailErr) => {
                console.error('Failed to send verification rejection email:', emailErr);
            });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateVerificationStatus = updateVerificationStatus;
const downloadVerificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const verification = yield prisma_1.prisma.verificationRequest.findUnique({
            where: { id },
            select: { requestId: true, uploadedTemplate: true }
        });
        if (!verification) {
            return res.status(404).json({ message: 'Verification request not found' });
        }
        const resolvedTemplatePath = resolveStoredFilePath(verification.uploadedTemplate);
        if (!resolvedTemplatePath) {
            return res.status(404).json({ message: 'Uploaded template file not found' });
        }
        const extension = path_1.default.extname(resolvedTemplatePath || '') || inferExtensionFromFile(resolvedTemplatePath) || '';
        return res.download(resolvedTemplatePath, `${verification.requestId}-template${extension}`);
    }
    catch (error) {
        console.error('Error downloading verification template:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.downloadVerificationTemplate = downloadVerificationTemplate;
const downloadCertificateIdProof = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const certificate = yield prisma_1.prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, idProofUrl: true }
        });
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }
        const resolvedFilePath = resolveStoredFilePath(certificate.idProofUrl);
        if (!resolvedFilePath) {
            return res.status(404).json({ message: 'Uploaded ID proof not found' });
        }
        const extension = path_1.default.extname(resolvedFilePath || '') || inferExtensionFromFile(resolvedFilePath) || '';
        return res.download(resolvedFilePath, `${certificate.id}-id-proof${extension}`);
    }
    catch (error) {
        console.error('Error downloading certificate ID proof:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.downloadCertificateIdProof = downloadCertificateIdProof;
const uploadVerificationCompletedFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        if (!req.file) {
            return res.status(400).json({ message: 'Completed file is required' });
        }
        const existing = yield prisma_1.prisma.verificationRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Verification request not found' });
        }
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: {
                completedFile: req.file.path,
                status: existing.status === 'PENDING' ? 'PROCESSING' : existing.status
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Error uploading completed verification file:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.uploadVerificationCompletedFile = uploadVerificationCompletedFile;
