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
const html_1 = require("../utils/html");
const fileStorage_1 = require("../utils/fileStorage");
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
    var _a;
    try {
        const id = String(req.params.id);
        const { status, action, rejectionReason } = req.body;
        const request = yield prisma_1.prisma.certificateRequest.findUnique({ where: { id }, include: { user: true } });
        if (!request)
            return res.status(404).json({ message: 'Not found' });
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
            const issuedCertificateUrl = (0, fileStorage_1.getUploadedFileUrl)(req.file);
            if (issuedCertificateUrl) {
                updateData.issuedCertificateUrl = issuedCertificateUrl;
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
        if ((_a = updated.user) === null || _a === void 0 ? void 0 : _a.email) {
            if (status === 'REJECTED' && request.status !== 'REJECTED') {
                const safeReason = String(rejectionReason || updated.rejectionReason || '').trim();
                const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
                const safeCertificateType = (0, html_1.escapeHtml)(updated.certificateType.replace('_', ' '));
                const safeRequestId = (0, html_1.escapeHtml)(updated.id);
                const safeReasonHtml = (0, html_1.escapeHtml)(safeReason || 'No reason was provided.');
                const emailHtml = `
                    <h2>Your Certificate Request Was Rejected</h2>
                    <p>Hello ${safeStudentName},</p>
                    <p>Your request for <strong>${safeCertificateType}</strong> (Request ID: ${safeRequestId}) was rejected by the admin team.</p>
                    <p><strong>Reason:</strong> ${safeReasonHtml}</p>
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
                const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
                const safeCertificateType = (0, html_1.escapeHtml)(updated.certificateType.replace('_', ' '));
                const safeRequestId = (0, html_1.escapeHtml)(updated.id);
                const emailHtml = `
                    <h2>Your Certificate Soft Copy is Ready</h2>
                    <p>Hello ${safeStudentName},</p>
                    <p>Your request for a <strong>${safeCertificateType}</strong> (Request ID: ${safeRequestId}) has been processed.</p>
                    <p>Please find your soft copy document attached to this email.</p>
                    ${updated.copyType === 'BOTH' && !updated.physicalCopyPosted ? '<p>Your physical hard copies are still being processed and will be dispatched shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                let attachments = [];
                if (req.file) {
                    attachments.push({ filename: req.file.originalname, path: String(req.file.path || '') });
                }
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Soft Copy Delivery', emailHtml, attachments);
            }
            if (action === 'MARK_POSTED' && !request.physicalCopyPosted) {
                const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
                const safeCertificateType = (0, html_1.escapeHtml)(updated.certificateType.replace('_', ' '));
                const safeRequestId = (0, html_1.escapeHtml)(updated.id);
                const emailHtml = `
                    <h2>Your Certificate Hard Copy Dispatched</h2>
                    <p>Hello ${safeStudentName},</p>
                    <p>Your physical hard copies for <strong>${safeCertificateType}</strong> (Request ID: ${safeRequestId}) have been dispatched to your provided address.</p>
                    ${updated.copyType === 'BOTH' && !updated.softCopyEmailed ? '<p>Your soft copy will be emailed to you shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Hard Copy Dispatched', emailHtml);
            }
            // Generic completion fallback if status manually set to COMPLETED without actions
            if (status === 'COMPLETED' && !action && request.status !== 'COMPLETED') {
                const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
                const safeCertificateType = (0, html_1.escapeHtml)(updated.certificateType.replace('_', ' '));
                const safeRequestId = (0, html_1.escapeHtml)(updated.id);
                const emailHtml = `
                    <h2>Your Certificate Request is Complete</h2>
                    <p>Hello ${safeStudentName},</p>
                    <p>Your request for a <strong>${safeCertificateType}</strong> (Request ID: ${safeRequestId}) has been manually marked as complete.</p>
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                yield (0, email_1.sendEmail)(updated.user.email, 'Certificate Request Completed', emailHtml);
            }
        }
        res.json(Object.assign(Object.assign({}, updated), { fileUrl: (0, fileStorage_1.getUploadedFileUrl)(req.file) }));
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
        const hasCompletedFile = Boolean(existing.completedFile) && Boolean((0, fileStorage_1.resolveLocalStoredPath)(existing.completedFile));
        if (status === 'COMPLETED' && !hasCompletedFile) {
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
            const safeContactPerson = (0, html_1.escapeHtml)(updated.contactPerson);
            const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
            const safeUsn = (0, html_1.escapeHtml)(updated.usn);
            const safeRequestId = (0, html_1.escapeHtml)(updated.requestId);
            const emailHtml = `
                <h2>Verification Completed</h2>
                <p>Hello ${safeContactPerson},</p>
                <p>Your verification request has been completed.</p>
                <p><strong>Student Name:</strong> ${safeStudentName}</p>
                <p><strong>USN:</strong> ${safeUsn}</p>
                <p><strong>Request ID:</strong> ${safeRequestId}</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            const attachments = updated.completedFile
                ? [{
                        filename: `${updated.requestId}-completed-file${(0, fileStorage_1.getStoredFileExtension)(updated.completedFile) || path_1.default.extname(updated.completedFile || '') || ''}`,
                        path: (0, fileStorage_1.resolveLocalStoredPath)(updated.completedFile) || updated.completedFile
                    }]
                : undefined;
            yield (0, email_1.sendEmail)(updated.companyEmail, 'Verification Completed – Global Academy of Technology', emailHtml, attachments);
        }
        if (status === 'REJECTED' && existing.status !== 'REJECTED' && updated.companyEmail) {
            const safeReason = String(rejectionReason || updated.rejectionReason || '').trim();
            const safeContactPerson = (0, html_1.escapeHtml)(updated.contactPerson);
            const safeStudentName = (0, html_1.escapeHtml)(updated.studentName);
            const safeUsn = (0, html_1.escapeHtml)(updated.usn);
            const safeRequestId = (0, html_1.escapeHtml)(updated.requestId);
            const safeReasonHtml = (0, html_1.escapeHtml)(safeReason || 'No reason was provided.');
            const emailHtml = `
                <h2>Verification Request Rejected</h2>
                <p>Hello ${safeContactPerson},</p>
                <p>Your verification request was rejected by the admin team.</p>
                <p><strong>Student Name:</strong> ${safeStudentName}</p>
                <p><strong>USN:</strong> ${safeUsn}</p>
                <p><strong>Request ID:</strong> ${safeRequestId}</p>
                <p><strong>Reason:</strong> ${safeReasonHtml}</p>
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
        const served = yield (0, fileStorage_1.sendStoredFile)(res, verification.uploadedTemplate, `${verification.requestId}-template${(0, fileStorage_1.getStoredFileExtension)(verification.uploadedTemplate)}`);
        if (!served) {
            return res.status(404).json({ message: 'Uploaded template file not found' });
        }
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
        const served = yield (0, fileStorage_1.sendStoredFile)(res, certificate.idProofUrl, `${certificate.id}-id-proof${(0, fileStorage_1.getStoredFileExtension)(certificate.idProofUrl)}`);
        if (!served) {
            return res.status(404).json({ message: 'Uploaded ID proof not found' });
        }
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
                completedFile: (0, fileStorage_1.getUploadedFileUrl)(req.file),
                status: existing.status === 'PENDING' ? 'PROCESSING' : existing.status
            }
        });
        return res.json(Object.assign(Object.assign({}, updated), { fileUrl: (0, fileStorage_1.getUploadedFileUrl)(req.file) }));
    }
    catch (error) {
        console.error('Error uploading completed verification file:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.uploadVerificationCompletedFile = uploadVerificationCompletedFile;
