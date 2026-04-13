import { Router } from 'express';
import {
	createCertificateRequest,
	getStudentRequests,
	completeCertificateRequest,
	downloadStudentIssuedCertificate,
	verifyCertificatePayment,
	createCertificatePaymentOrder,
	cancelStudentCertificateRequest
} from '../controllers/certificateController';
import { authenticate } from '../middleware/authMiddleware';
import { certificateIdProofUpload } from '../middleware/upload';

const router = Router();

const certificateUploadHandler = (req: any, res: any, next: any) => {
	certificateIdProofUpload.single('idProof')(req, res, (err: any) => {
		if (err) {
			const message = err.code === 'LIMIT_FILE_SIZE'
				? 'File too large. Maximum allowed size is 10MB.'
				: (err.message || 'File upload failed');
			return res.status(400).json({ message });
		}
		next();
	});
};

router.post('/student/certificates', authenticate, certificateUploadHandler, createCertificateRequest);
router.get('/student/certificates', authenticate, getStudentRequests);
router.get('/student/certificates/:id/download', authenticate, downloadStudentIssuedCertificate);
router.post('/student/certificates/:id/verify-payment', authenticate, verifyCertificatePayment);
router.post('/student/certificates/:id/create-payment-order', authenticate, createCertificatePaymentOrder);
router.post('/student/certificates/:id/cancel', authenticate, cancelStudentCertificateRequest);

// Admin routes
router.put('/admin/certificates/:id/complete', authenticate, completeCertificateRequest);

export default router;
