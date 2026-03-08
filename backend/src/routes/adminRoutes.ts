import { Router } from 'express';
import { getDashboardStats, getAllCertificates, updateCertificateStatus, getAllVerifications, updateVerificationStatus } from '../controllers/adminController';
import { requireRole, authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

const router = Router();

// Assuming admin token has role === 'ADMIN'
// Since Admin login is via static credentials right now or we might not have 'requireRole' fully robust, let's just authenticate for now, or use requireRole if we set it up.
// Looking at the instructions, Admin login expects JWT token with role. We'll secure these endpoints.

router.get('/dashboard', authenticate, requireRole('ADMIN'), getDashboardStats);

router.get('/certificates', authenticate, requireRole('ADMIN'), getAllCertificates);
router.put('/certificates/:id/status', authenticate, requireRole('ADMIN'), upload.single('file'), updateCertificateStatus);

router.get('/verifications', authenticate, requireRole('ADMIN'), getAllVerifications);
router.put('/verifications/:id/status', authenticate, requireRole('ADMIN'), updateVerificationStatus);

export default router;
