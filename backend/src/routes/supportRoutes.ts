import { Router } from 'express';
import { createIssueReport } from '../controllers/supportController';
import { simpleRateLimit } from '../middleware/rateLimit';

const router = Router();
const supportLimiter = simpleRateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: 'support' });

router.post('/support/issues', supportLimiter, createIssueReport);

export default router;
