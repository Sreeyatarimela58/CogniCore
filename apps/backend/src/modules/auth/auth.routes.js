import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
