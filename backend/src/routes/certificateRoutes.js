"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificateController_1 = require("../controllers/certificateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uploadsDir = path_1.default.join(__dirname, '../../uploads/');
const certificateStorage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.bin';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});
const upload = (0, multer_1.default)({
    storage: certificateStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const isValidExt = allowedExtensions.includes(ext);
        const isValidMime = allowedMimeTypes.includes(file.mimetype);
        if (isValidExt || isValidMime) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Allowed: PDF, JPG, JPEG, PNG'));
        }
    }
});
const router = (0, express_1.Router)();
const certificateUploadHandler = (req, res, next) => {
    upload.single('idProof')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum allowed size is 10MB.'
                : (err.message || 'File upload failed');
            return res.status(400).json({ message });
        }
        next();
    });
};
router.post('/student/certificates', authMiddleware_1.authenticate, certificateUploadHandler, certificateController_1.createCertificateRequest);
router.get('/student/certificates', authMiddleware_1.authenticate, certificateController_1.getStudentRequests);
router.get('/student/certificates/:id/download', authMiddleware_1.authenticate, certificateController_1.downloadStudentIssuedCertificate);
router.post('/student/certificates/:id/verify-payment', authMiddleware_1.authenticate, certificateController_1.verifyCertificatePayment);
router.post('/student/certificates/:id/create-payment-order', authMiddleware_1.authenticate, certificateController_1.createCertificatePaymentOrder);
router.post('/student/certificates/:id/cancel', authMiddleware_1.authenticate, certificateController_1.cancelStudentCertificateRequest);
// Admin routes
router.put('/admin/certificates/:id/complete', authMiddleware_1.authenticate, certificateController_1.completeCertificateRequest);
exports.default = router;
