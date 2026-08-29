import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().optional(),
  name: z.string().optional(),
});

router.get('/config', AuthController.getConfig);
router.post('/google/credential', AuthController.googleCredential);
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);
router.post('/login', validateRequest({ body: loginSchema }), AuthController.login);
router.post('/dev-login', validateRequest({ body: loginSchema }), AuthController.devLogin);
router.get('/me', requireAuth, AuthController.me);
router.post('/logout', AuthController.logout);

export default router;
