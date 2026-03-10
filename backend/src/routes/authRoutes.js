"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Student routes
router.post('/login', authController_1.studentLogin);
router.post('/verify-otp', authController_1.verifyOtp);
// Company routes
router.post('/company/login', authController_1.companyLogin);
router.post('/company/verify-otp', authController_1.verifyOtp);
// Admin routes
router.post('/admin/login', authController_1.adminLogin);
exports.default = router;
