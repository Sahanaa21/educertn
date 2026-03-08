import { Router } from 'express';
import { createCertificateRequest, getStudentRequests, completeCertificateRequest } from '../controllers/certificateController';
import { authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

// Setup basic multer upload destination
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

const router = Router();

router.post('/student/certificates', authenticate, upload.single('idProof'), createCertificateRequest);
router.get('/student/certificates', authenticate, getStudentRequests);

// Admin routes
router.put('/admin/certificates/:id/complete', authenticate, completeCertificateRequest);

export default router;
