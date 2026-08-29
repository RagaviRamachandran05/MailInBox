import { Router } from 'express';
import authRoutes from './authRoutes';
import emailRoutes from './emailRoutes';
import slackRoutes from './slackRoutes';
import senderRoutes from './senderRoutes';
import queueRoutes from './queueRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);
router.use('/senders', senderRoutes);
router.use('/queue', queueRoutes);

export default router;
