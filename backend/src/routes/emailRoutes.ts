import { Router } from 'express';
import { EmailController } from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email recipient')).min(1, 'At least one recipient is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO start time format',
  }),
  delayBetweenEmails: z.number().int().positive('Delay must be a positive integer').optional(),
  hourlyLimit: z.number().int().positive('Hourly limit must be a positive integer').optional(),
  senderId: z.string().uuid().optional(),
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
});

const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['scheduled', 'processing', 'sent', 'failed']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

router.use(requireAuth);

router.post('/schedule', validateRequest({ body: scheduleEmailSchema }), EmailController.scheduleEmail);
router.get('/scheduled', validateRequest({ query: paginationSchema }), EmailController.getScheduled);
router.get('/sent', validateRequest({ query: paginationSchema }), EmailController.getSent);
router.get('/search', validateRequest({ query: searchSchema }), EmailController.searchEmails);
router.get('/stats', EmailController.getStats);
router.get('/:id', EmailController.getById);
router.delete('/:id', EmailController.deleteEmail);

export default router;
