import { Router } from 'express';
import { createVerificationRequest, downloadCompanyCompletedFile, getCompanyVerifications } from '../controllers/verificationController';
import { authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const verificationUpload = multer({
	dest: path.join(__dirname, '../../uploads/'),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
		const allowedMimeTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'image/jpeg',
			'image/png'
		];

		const ext = path.extname(file.originalname || '').toLowerCase();
		const isValidExt = allowedExtensions.includes(ext);
		const isValidMime = allowedMimeTypes.includes(file.mimetype);

		if (isValidExt || isValidMime) {
			cb(null, true);
		} else {
			cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG'));
		}
	}
});

const router = Router();

const verificationTemplateUploadHandler = (req: any, res: any, next: any) => {
	verificationUpload.single('verificationTemplate')(req, res, (err: any) => {
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

export default router;
