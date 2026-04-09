import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getOpsMetrics, getOpsIssuesSummary } from '../controllers/opsController';

const router = Router();

// All ops endpoints require admin authentication
router.get('/metrics', authenticate, getOpsMetrics);
router.get('/issues-summary', authenticate, getOpsIssuesSummary);

export default router;
