"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificateController_1 = require("../controllers/certificateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const certificateUploadHandler = (req, res, next) => {
    upload_1.certificateIdProofUpload.single('idProof')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum allowed size is 10MB.'
                : (err.message || 'File upload failed');
            return res.status(400).json({ message });
        }
        next();
    });
};
router.post('/student/certificates', authMiddleware_1.authenticate, certificateUploadHandler, certificateController_1.createCertificateRequest);
router.get('/student/certificates', authMiddleware_1.authenticate, certificateController_1.getStudentRequests);
router.get('/student/certificates/:id/download', authMiddleware_1.authenticate, certificateController_1.downloadStudentIssuedCertificate);
router.post('/student/certificates/:id/verify-payment', authMiddleware_1.authenticate, certificateController_1.verifyCertificatePayment);
router.post('/student/certificates/:id/create-payment-order', authMiddleware_1.authenticate, certificateController_1.createCertificatePaymentOrder);
router.post('/student/certificates/:id/cancel', authMiddleware_1.authenticate, certificateController_1.cancelStudentCertificateRequest);
// Admin routes
router.put('/admin/certificates/:id/complete', authMiddleware_1.authenticate, certificateController_1.completeCertificateRequest);
exports.default = router;
