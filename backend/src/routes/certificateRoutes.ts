import { Router } from 'express';
import { createCertificateRequest, getStudentRequests, completeCertificateRequest, downloadStudentIssuedCertificate, verifyCertificatePayment, createCertificatePaymentOrder } from '../controllers/certificateController';
import { authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const uploadsDir = path.join(__dirname, '../../uploads/');
const certificateStorage = multer.diskStorage({
	destination: uploadsDir,
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const safeExt = ext || '.bin';
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
	}
});

const upload = multer({
	storage: certificateStorage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
		const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
		const ext = path.extname(file.originalname || '').toLowerCase();
		const isValidExt = allowedExtensions.includes(ext);
		const isValidMime = allowedMimeTypes.includes(file.mimetype);

		if (isValidExt || isValidMime) {
			cb(null, true);
		} else {
			cb(new Error('Invalid file type. Allowed: PDF, JPG, JPEG, PNG'));
		}
	}
});

const router = Router();

const certificateUploadHandler = (req: any, res: any, next: any) => {
	upload.single('idProof')(req, res, (err: any) => {
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

// Admin routes
router.put('/admin/certificates/:id/complete', authenticate, completeCertificateRequest);

export default router;
