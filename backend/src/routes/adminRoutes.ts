import { Router } from 'express';
import {
	getDashboardStats,
	getAllCertificates,
	updateCertificateStatus,
	getAllVerifications,
	updateVerificationStatus,
	downloadVerificationTemplate,
	uploadVerificationCompletedFile
} from '../controllers/adminController';
import { getAllIssueReports, updateIssueReport } from '../controllers/supportController';
import { getPortalSettings, updatePortalSettings } from '../controllers/settingsController';
import { changeAdminPassword } from '../controllers/authController';
import { requireRole, authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import { simpleRateLimit } from '../middleware/rateLimit';

const uploadsDir = path.join(__dirname, '../../uploads/');
const uploadsWithExtStorage = multer.diskStorage({
	destination: uploadsDir,
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const safeExt = ext || '.bin';
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
	}
});

const upload = multer({ storage: uploadsWithExtStorage });
const verificationResponseUpload = multer({
	storage: uploadsWithExtStorage,
	limits: { fileSize: 10 * 1024 * 1024 }
});
const adminMutationLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: 'admin-mutation' });

const router = Router();

// Assuming admin token has role === 'ADMIN'
// Since Admin login is via static credentials right now or we might not have 'requireRole' fully robust, let's just authenticate for now, or use requireRole if we set it up.
// Looking at the instructions, Admin login expects JWT token with role. We'll secure these endpoints.

router.get('/dashboard', authenticate, requireRole('ADMIN'), getDashboardStats);

router.get('/certificates', authenticate, requireRole('ADMIN'), getAllCertificates);
router.put('/certificates/:id/status', authenticate, requireRole('ADMIN'), adminMutationLimiter, upload.single('file'), updateCertificateStatus);

router.get('/verifications', authenticate, requireRole('ADMIN'), getAllVerifications);
router.put('/verifications/:id/status', authenticate, requireRole('ADMIN'), adminMutationLimiter, updateVerificationStatus);
router.get('/verifications/:id/template', authenticate, requireRole('ADMIN'), downloadVerificationTemplate);
router.put('/verifications/:id/completed-file', authenticate, requireRole('ADMIN'), adminMutationLimiter, verificationResponseUpload.single('file'), uploadVerificationCompletedFile);

router.get('/issues', authenticate, requireRole('ADMIN'), getAllIssueReports);
router.put('/issues/:id', authenticate, requireRole('ADMIN'), adminMutationLimiter, updateIssueReport);

router.get('/settings', authenticate, requireRole('ADMIN'), getPortalSettings);
router.put('/settings', authenticate, requireRole('ADMIN'), adminMutationLimiter, updatePortalSettings);

router.post('/change-password', authenticate, requireRole('ADMIN'), adminMutationLimiter, changeAdminPassword);

export default router;
