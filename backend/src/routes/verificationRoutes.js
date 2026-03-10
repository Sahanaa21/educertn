"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/company/verifications', authMiddleware_1.authenticate, verificationController_1.createVerificationRequest);
router.get('/company/verifications', authMiddleware_1.authenticate, verificationController_1.getCompanyVerifications);
// Admin routes
router.put('/admin/verifications/:id/complete', authMiddleware_1.authenticate, verificationController_1.completeVerificationRequest);
exports.default = router;
