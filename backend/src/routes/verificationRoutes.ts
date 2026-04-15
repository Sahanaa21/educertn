import { Router } from 'express';
import {
	createVerificationRequest,
	downloadCompanyCompletedFile,
	getCompanyVerifications,
	verifyVerificationPayment,
	createVerificationPaymentOrder,
	cancelCompanyVerificationRequest,
	markCompanyVerificationPaymentFailed
} from '../controllers/verificationController';
import { authenticate } from '../middleware/authMiddleware';
import { verificationTemplateUpload } from '../middleware/upload';

const router = Router();

const verificationTemplateUploadHandler = (req: any, res: any, next: any) => {
	verificationTemplateUpload.single('verificationTemplate')(req, res, (err: any) => {
		if (err) {
			const message = err.code === 'LIMIT_FILE_SIZE'
				? 'File too large. Maximum allowed size is 10MB.'
				: (err.message || 'File upload failed');
			return res.status(400).json({ message });
		}
		next();
	});
};

router.post('/company/verifications', authenticate, verificationTemplateUploadHandler, createVerificationRequest);
router.get('/company/verifications', authenticate, getCompanyVerifications);
router.get('/company/verifications/:id/response', authenticate, downloadCompanyCompletedFile);
router.post('/company/verifications/:id/verify-payment', authenticate, verifyVerificationPayment);
router.post('/company/verifications/:id/create-payment-order', authenticate, createVerificationPaymentOrder);
router.post('/company/verifications/:id/mark-payment-failed', authenticate, markCompanyVerificationPaymentFailed);
router.post('/company/verifications/:id/cancel', authenticate, cancelCompanyVerificationRequest);

export default router;
