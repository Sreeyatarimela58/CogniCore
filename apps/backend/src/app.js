import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import connectionRoutes from './modules/connection/connection.routes.js';
import schemaRoutes from './modules/schema-discovery/schema.routes.js';
import { errorHandler } from './shared/middlewares/error-handler.middleware.js';
import { logger } from './config/logger.js';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/databases', connectionRoutes);
app.use('/api/schema', schemaRoutes);

// Error handling
app.use(errorHandler);

export default app;
