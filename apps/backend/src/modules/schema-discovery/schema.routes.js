import { Router } from 'express';
import * as connectionController from '../connection/connection.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all schema routes
router.use(authenticate);

// Phase 2 Schema Routes
router.get('/tables', connectionController.getSchemaTables);

export default router;
