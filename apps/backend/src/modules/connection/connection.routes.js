import { Router } from 'express';
import * as connectionController from './connection.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all connection/schema routes
router.use(authenticate);

// Database Connection Routes
router.get('/', connectionController.getConnections);
router.post('/', connectionController.createConnection);
router.post('/test', connectionController.testConnection);
router.put('/:id', connectionController.updateConnection);
router.delete('/:id', connectionController.deleteConnection);
router.post('/:id/sync', connectionController.syncConnection);
router.post('/:id/refresh', connectionController.syncConnection); // Phase 3 incremental refresh
router.get('/:id/status', connectionController.getConnectionStatus);

// Note: Schema routes have been moved to schema.routes.js

export default router;
