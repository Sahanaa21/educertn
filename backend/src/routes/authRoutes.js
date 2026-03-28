"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const rateLimit_1 = require("../middleware/rateLimit");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const authLimiter = (0, rateLimit_1.simpleRateLimit)({ windowMs: 60 * 1000, max: 12, keyPrefix: 'auth' });
// Student routes
router.post('/login', authLimiter, authController_1.studentLogin);
router.post('/verify-otp', authLimiter, authController_1.verifyOtp);
// Company routes
router.post('/company/login', authLimiter, authController_1.companyLogin);
router.post('/company/verify-otp', authLimiter, authController_1.verifyOtp);
// Unified auth routes (preferred)
router.post('/request-otp', authLimiter, authController_1.requestUnifiedOtp);
router.post('/verify-unified-otp', authLimiter, authController_1.verifyUnifiedOtp);
router.post('/complete-profile', authLimiter, authController_1.completeUnifiedProfile);
router.get('/me', authMiddleware_1.authenticate, authController_1.getCurrentProfile);
exports.default = router;
