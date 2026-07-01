import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/** Global error handler — must be registered last in Express after all routes. */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  const isDev = ENV.NODE_ENV === 'development';

  logger.error(err);

  res.status(500).json({
    message: 'Internal server error',
    ...(isDev && { detail: err instanceof Error ? err.message : String(err) }),
  });
}
