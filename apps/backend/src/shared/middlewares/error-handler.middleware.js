import { logger } from '../../config/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({ err, req }, err.message || 'Internal Server Error');

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code: code,
      message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
      details: err.details || undefined,
    }
  });
}
