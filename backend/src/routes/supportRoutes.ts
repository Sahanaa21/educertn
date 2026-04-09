import { Router } from 'express';
import { createIssueReport, updateIssueReportFromEmail } from '../controllers/supportController';
import { simpleRateLimit } from '../middleware/rateLimit';

const router = Router();
const supportLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: 'support' });

router.post('/support/issues', supportLimiter, createIssueReport);
router.get('/support/issues/:id/mail-action', supportLimiter, updateIssueReportFromEmail);

export default router;
