import { Router } from 'express';
import { SlackController } from '../controllers/slackController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/callback', SlackController.callback);

router.use(requireAuth);

router.get('/connect', SlackController.connect);
router.get('/status', SlackController.getStatus);
router.post('/webhook', SlackController.saveWebhook);
router.post('/test', SlackController.test);
router.post('/disconnect', SlackController.disconnect);

export default router;
