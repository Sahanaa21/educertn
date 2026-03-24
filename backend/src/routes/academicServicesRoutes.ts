import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import {
    createAcademicServicePaymentOrder,
    createAcademicServiceRequest,
    getAcademicServicesAvailabilityPublic,
    getAcademicServicesAvailabilityStudent,
    getAcademicServiceSettingsAdmin,
    getAllAcademicServiceRequests,
    getStudentAcademicServiceRequests,
    updateAcademicServiceRequest,
    updateAcademicServiceSettingsAdmin,
    uploadAcademicServiceAttachments,
    verifyAcademicServicePayment,
} from '../controllers/academicServicesController';

const uploadsDir = path.join(__dirname, '../../uploads/');

const attachmentStorage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.bin';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});

const upload = multer({
    storage: attachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get('/academic-services/availability', getAcademicServicesAvailabilityPublic);

router.get('/student/academic-services/availability', authenticate, requireRole('STUDENT'), getAcademicServicesAvailabilityStudent);
router.post('/student/academic-services', authenticate, requireRole('STUDENT'), createAcademicServiceRequest);
router.get('/student/academic-services', authenticate, requireRole('STUDENT'), getStudentAcademicServiceRequests);
router.post('/student/academic-services/:id/create-payment-order', authenticate, requireRole('STUDENT'), createAcademicServicePaymentOrder);
router.post('/student/academic-services/:id/verify-payment', authenticate, requireRole('STUDENT'), verifyAcademicServicePayment);

router.get('/admin/academic-services', authenticate, requireRole('ADMIN'), getAllAcademicServiceRequests);
router.put('/admin/academic-services/:id', authenticate, requireRole('ADMIN'), updateAcademicServiceRequest);
router.post('/admin/academic-services/:id/attachments', authenticate, requireRole('ADMIN'), upload.array('files', 5), uploadAcademicServiceAttachments);
router.get('/admin/academic-services/settings', authenticate, requireRole('ADMIN'), getAcademicServiceSettingsAdmin);
router.put('/admin/academic-services/settings', authenticate, requireRole('ADMIN'), updateAcademicServiceSettingsAdmin);

export default router;
