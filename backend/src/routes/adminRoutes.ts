import { Router } from 'express';
import {
	getDashboardStats,
	getAllCertificates,
	updateCertificateStatus,
	downloadCertificateIdProof,
	getAllVerifications,
	updateVerificationStatus,
	downloadVerificationTemplate,
	uploadVerificationCompletedFile
} from '../controllers/adminController';
import { getAllIssueReports } from '../controllers/supportController';
import { getPortalSettings, registerAdminEmail, removeAdminEmail, updatePortalSettings } from '../controllers/settingsController';
import { requireRole, authenticate } from '../middleware/authMiddleware';
import { simpleRateLimit } from '../middleware/rateLimit';
import { certificateIssuedFileUpload, verificationCompletedFileUpload } from '../middleware/upload';
const adminMutationLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: 'admin-mutation' });

const router = Router();

router.get('/dashboard', authenticate, requireRole('ADMIN'), getDashboardStats);

router.get('/certificates', authenticate, requireRole('ADMIN'), getAllCertificates);
router.put('/certificates/:id/status', authenticate, requireRole('ADMIN'), adminMutationLimiter, certificateIssuedFileUpload.single('file'), updateCertificateStatus);
router.get('/certificates/:id/id-proof', authenticate, requireRole('ADMIN'), downloadCertificateIdProof);

router.get('/verifications', authenticate, requireRole('ADMIN'), getAllVerifications);
router.put('/verifications/:id/status', authenticate, requireRole('ADMIN'), adminMutationLimiter, updateVerificationStatus);
router.get('/verifications/:id/template', authenticate, requireRole('ADMIN'), downloadVerificationTemplate);
router.put('/verifications/:id/completed-file', authenticate, requireRole('ADMIN'), adminMutationLimiter, verificationCompletedFileUpload.single('file'), uploadVerificationCompletedFile);

router.get('/issues', authenticate, requireRole('ADMIN'), getAllIssueReports);

router.get('/settings', authenticate, requireRole('ADMIN'), getPortalSettings);
router.put('/settings', authenticate, requireRole('ADMIN'), adminMutationLimiter, updatePortalSettings);
router.post('/settings/admin-emails', authenticate, requireRole('ADMIN'), adminMutationLimiter, registerAdminEmail);
router.delete('/settings/admin-emails', authenticate, requireRole('ADMIN'), adminMutationLimiter, removeAdminEmail);

export default router;
