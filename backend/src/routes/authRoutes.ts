import { Router } from 'express';
import {
	studentLogin,
	verifyOtp,
	companyLogin,
	requestUnifiedOtp,
	verifyUnifiedOtp,
	completeUnifiedProfile,
	getCurrentProfile
} from '../controllers/authController';
import { simpleRateLimit } from '../middleware/rateLimit';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const authLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 8, keyPrefix: 'auth' });

// Student routes
router.post('/login', authLimiter, studentLogin);
router.post('/verify-otp', authLimiter, verifyOtp);

// Company routes
router.post('/company/login', authLimiter, companyLogin);
router.post('/company/verify-otp', authLimiter, verifyOtp);

// Unified auth routes (preferred)
router.post('/request-otp', authLimiter, requestUnifiedOtp);
router.post('/verify-unified-otp', authLimiter, verifyUnifiedOtp);
router.post('/complete-profile', authLimiter, completeUnifiedProfile);
router.get('/me', authenticate, getCurrentProfile);

export default router;
