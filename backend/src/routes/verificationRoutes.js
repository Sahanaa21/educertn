"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uploadsDir = path_1.default.join(__dirname, '../../uploads/');
const verificationTemplateStorage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.bin';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});
const verificationUpload = (0, multer_1.default)({
    storage: verificationTemplateStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const isValidExt = allowedExtensions.includes(ext);
        const isValidMime = allowedMimeTypes.includes(file.mimetype);
        if (isValidExt || isValidMime) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG'));
        }
    }
});
const router = (0, express_1.Router)();
const verificationTemplateUploadHandler = (req, res, next) => {
    verificationUpload.single('verificationTemplate')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum allowed size is 10MB.'
                : (err.message || 'File upload failed');
            return res.status(400).json({ message });
        }
        next();
    });
};
router.post('/company/verifications', authMiddleware_1.authenticate, verificationTemplateUploadHandler, verificationController_1.createVerificationRequest);
router.get('/company/verifications', authMiddleware_1.authenticate, verificationController_1.getCompanyVerifications);
router.get('/company/verifications/:id/response', authMiddleware_1.authenticate, verificationController_1.downloadCompanyCompletedFile);
router.post('/company/verifications/:id/verify-payment', authMiddleware_1.authenticate, verificationController_1.verifyVerificationPayment);
router.post('/company/verifications/:id/create-payment-order', authMiddleware_1.authenticate, verificationController_1.createVerificationPaymentOrder);
router.post('/company/verifications/:id/cancel', authMiddleware_1.authenticate, verificationController_1.cancelCompanyVerificationRequest);
exports.default = router;
