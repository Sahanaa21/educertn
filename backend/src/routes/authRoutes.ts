import { Router } from 'express';
import { studentLogin, verifyOtp, companyLogin, adminLogin } from '../controllers/authController';

const router = Router();

// Student routes
router.post('/login', studentLogin);
router.post('/verify-otp', verifyOtp);

// Company routes
router.post('/company/login', companyLogin);
router.post('/company/verify-otp', verifyOtp);

// Admin routes
router.post('/admin/login', adminLogin);

export default router;
