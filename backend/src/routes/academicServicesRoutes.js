"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const academicServicesController_1 = require("../controllers/academicServicesController");
const uploadsDir = path_1.default.join(__dirname, '../../uploads/');
const attachmentStorage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.bin';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});
const upload = (0, multer_1.default)({
    storage: attachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});
const router = (0, express_1.Router)();
router.get('/academic-services/availability', academicServicesController_1.getAcademicServicesAvailabilityPublic);
router.get('/student/academic-services/availability', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('STUDENT'), academicServicesController_1.getAcademicServicesAvailabilityStudent);
router.post('/student/academic-services', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('STUDENT'), academicServicesController_1.createAcademicServiceRequest);
router.get('/student/academic-services', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('STUDENT'), academicServicesController_1.getStudentAcademicServiceRequests);
router.post('/student/academic-services/:id/create-payment-order', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('STUDENT'), academicServicesController_1.createAcademicServicePaymentOrder);
router.post('/student/academic-services/:id/verify-payment', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('STUDENT'), academicServicesController_1.verifyAcademicServicePayment);
router.get('/admin/academic-services', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), academicServicesController_1.getAllAcademicServiceRequests);
router.put('/admin/academic-services/:id', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), academicServicesController_1.updateAcademicServiceRequest);
router.post('/admin/academic-services/:id/attachments', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), upload.array('files', 5), academicServicesController_1.uploadAcademicServiceAttachments);
router.get('/admin/academic-services/settings', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), academicServicesController_1.getAcademicServiceSettingsAdmin);
router.put('/admin/academic-services/settings', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), academicServicesController_1.updateAcademicServiceSettingsAdmin);
exports.default = router;
