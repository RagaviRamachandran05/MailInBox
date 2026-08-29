import { Router } from 'express';
import { getQueueMetrics } from '../controllers/queueController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Allow authenticated users to view live queue stats for the dashboard and demo panel
router.get('/stats', requireAuth, getQueueMetrics);

export default router;
