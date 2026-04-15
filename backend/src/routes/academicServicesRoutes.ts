import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { academicServiceAttachmentUpload } from '../middleware/upload';
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
    markAcademicServicePaymentFailed,
} from '../controllers/academicServicesController';

const router = Router();

router.get('/academic-services/availability', getAcademicServicesAvailabilityPublic);

router.get('/student/academic-services/availability', authenticate, requireRole('STUDENT'), getAcademicServicesAvailabilityStudent);
router.post('/student/academic-services', authenticate, requireRole('STUDENT'), createAcademicServiceRequest);
router.get('/student/academic-services', authenticate, requireRole('STUDENT'), getStudentAcademicServiceRequests);
router.post('/student/academic-services/:id/create-payment-order', authenticate, requireRole('STUDENT'), createAcademicServicePaymentOrder);
router.post('/student/academic-services/:id/verify-payment', authenticate, requireRole('STUDENT'), verifyAcademicServicePayment);
router.post('/student/academic-services/:id/mark-payment-failed', authenticate, requireRole('STUDENT'), markAcademicServicePaymentFailed);

router.get('/admin/academic-services', authenticate, requireRole('ADMIN'), getAllAcademicServiceRequests);
router.get('/admin/academic-services/settings', authenticate, requireRole('ADMIN'), getAcademicServiceSettingsAdmin);
router.put('/admin/academic-services/settings', authenticate, requireRole('ADMIN'), updateAcademicServiceSettingsAdmin);
router.put('/admin/academic-services/:id', authenticate, requireRole('ADMIN'), updateAcademicServiceRequest);
router.post('/admin/academic-services/:id/attachments', authenticate, requireRole('ADMIN'), academicServiceAttachmentUpload.array('files', 5), uploadAcademicServiceAttachments);

export default router;
