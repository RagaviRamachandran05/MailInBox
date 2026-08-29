import { Router } from 'express';
import { SenderController } from '../controllers/senderController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required'),
  email: z.string().email('Valid sender email is required'),
  etherealUser: z.string().optional(),
  etherealPassword: z.string().optional(),
  hourlyLimit: z.number().int().positive('Hourly limit must be positive').optional(),
  isDefault: z.boolean().optional(),
});

router.use(requireAuth);

router.get('/', SenderController.listSenders);
router.post('/', validateRequest({ body: createSenderSchema }), SenderController.createSender);
router.delete('/:id', SenderController.deleteSender);

export default router;
