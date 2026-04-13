"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const verificationTemplateUploadHandler = (req, res, next) => {
    upload_1.verificationTemplateUpload.single('verificationTemplate')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum allowed size is 10MB.'
                : (err.message || 'File upload failed');
            return res.status(400).json({ message });
        }
        next();
    });
};
router.post('/company/verifications', authMiddleware_1.authenticate, verificationTemplateUploadHandler, verificationController_1.createVerificationRequest);
router.get('/company/verifications', authMiddleware_1.authenticate, verificationController_1.getCompanyVerifications);
router.get('/company/verifications/:id/response', authMiddleware_1.authenticate, verificationController_1.downloadCompanyCompletedFile);
router.post('/company/verifications/:id/verify-payment', authMiddleware_1.authenticate, verificationController_1.verifyVerificationPayment);
router.post('/company/verifications/:id/create-payment-order', authMiddleware_1.authenticate, verificationController_1.createVerificationPaymentOrder);
router.post('/company/verifications/:id/cancel', authMiddleware_1.authenticate, verificationController_1.cancelCompanyVerificationRequest);
exports.default = router;
