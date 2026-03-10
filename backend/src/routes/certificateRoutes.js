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
// Setup basic multer upload destination
const upload = (0, multer_1.default)({ dest: path_1.default.join(__dirname, '../../uploads/') });
const router = (0, express_1.Router)();
router.post('/student/certificates', authMiddleware_1.authenticate, upload.single('idProof'), certificateController_1.createCertificateRequest);
router.get('/student/certificates', authMiddleware_1.authenticate, certificateController_1.getStudentRequests);
// Admin routes
router.put('/admin/certificates/:id/complete', authMiddleware_1.authenticate, certificateController_1.completeCertificateRequest);
exports.default = router;
