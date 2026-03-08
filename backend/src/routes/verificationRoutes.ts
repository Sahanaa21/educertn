import { Router } from 'express';
import { createVerificationRequest, completeVerificationRequest, getCompanyVerifications } from '../controllers/verificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/company/verifications', authenticate, createVerificationRequest);
router.get('/company/verifications', authenticate, getCompanyVerifications);

// Admin routes
router.put('/admin/verifications/:id/complete', authenticate, completeVerificationRequest);

export default router;
