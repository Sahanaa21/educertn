"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
const authLimiter = (0, rateLimit_1.simpleRateLimit)({ windowMs: 60 * 1000, max: 12, keyPrefix: 'auth' });
const adminAuthLimiter = (0, rateLimit_1.simpleRateLimit)({ windowMs: 15 * 60 * 1000, max: 6, keyPrefix: 'admin-auth' });
// Student routes
router.post('/login', authLimiter, authController_1.studentLogin);
router.post('/verify-otp', authLimiter, authController_1.verifyOtp);
// Company routes
router.post('/company/login', authLimiter, authController_1.companyLogin);
router.post('/company/verify-otp', authLimiter, authController_1.verifyOtp);
// Admin routes
router.post('/admin/login', adminAuthLimiter, authController_1.adminLogin);
exports.default = router;
