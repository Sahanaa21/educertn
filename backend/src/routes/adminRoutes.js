"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const supportController_1 = require("../controllers/supportController");
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const rateLimit_1 = require("../middleware/rateLimit");
const uploadsDir = path_1.default.join(__dirname, '../../uploads/');
const uploadsWithExtStorage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.bin';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});
const upload = (0, multer_1.default)({ storage: uploadsWithExtStorage });
const verificationResponseUpload = (0, multer_1.default)({
    storage: uploadsWithExtStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});
const adminMutationLimiter = (0, rateLimit_1.simpleRateLimit)({ windowMs: 60 * 1000, max: 30, keyPrefix: 'admin-mutation' });
const router = (0, express_1.Router)();
router.get('/dashboard', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getDashboardStats);
router.get('/certificates', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getAllCertificates);
router.put('/certificates/:id/status', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, upload.single('file'), adminController_1.updateCertificateStatus);
router.get('/certificates/:id/id-proof', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.downloadCertificateIdProof);
router.get('/verifications', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getAllVerifications);
router.put('/verifications/:id/status', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, adminController_1.updateVerificationStatus);
router.get('/verifications/:id/template', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.downloadVerificationTemplate);
router.put('/verifications/:id/completed-file', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, verificationResponseUpload.single('file'), adminController_1.uploadVerificationCompletedFile);
router.get('/issues', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), supportController_1.getAllIssueReports);
router.put('/issues/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, supportController_1.updateIssueReport);
router.get('/settings', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), settingsController_1.getPortalSettings);
router.put('/settings', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, settingsController_1.updatePortalSettings);
router.post('/settings/admin-emails', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, settingsController_1.registerAdminEmail);
router.delete('/settings/admin-emails', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminMutationLimiter, settingsController_1.removeAdminEmail);
exports.default = router;
