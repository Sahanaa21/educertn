"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const upload = (0, multer_1.default)({ dest: path_1.default.join(__dirname, '../../uploads/') });
const router = (0, express_1.Router)();
// Assuming admin token has role === 'ADMIN'
// Since Admin login is via static credentials right now or we might not have 'requireRole' fully robust, let's just authenticate for now, or use requireRole if we set it up.
// Looking at the instructions, Admin login expects JWT token with role. We'll secure these endpoints.
router.get('/dashboard', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getDashboardStats);
router.get('/certificates', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getAllCertificates);
router.put('/certificates/:id/status', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), upload.single('file'), adminController_1.updateCertificateStatus);
router.get('/verifications', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.getAllVerifications);
router.put('/verifications/:id/status', authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)('ADMIN'), adminController_1.updateVerificationStatus);
exports.default = router;
