import { Router } from 'express';
import { studentLogin, verifyOtp, companyLogin, adminLogin } from '../controllers/authController';
import { simpleRateLimit } from '../middleware/rateLimit';

const router = Router();
const authLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 12, keyPrefix: 'auth' });
const adminAuthLimiter = simpleRateLimit({ windowMs: 15 * 60 * 1000, max: 6, keyPrefix: 'admin-auth' });

// Student routes
router.post('/login', authLimiter, studentLogin);
router.post('/verify-otp', authLimiter, verifyOtp);

// Company routes
router.post('/company/login', authLimiter, companyLogin);
router.post('/company/verify-otp', authLimiter, verifyOtp);

// Admin routes
router.post('/admin/login', adminAuthLimiter, adminLogin);

export default router;
