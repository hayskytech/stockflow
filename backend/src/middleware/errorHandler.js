import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  /** `details` is an optional machine-readable payload (e.g. the list of order-acceptance failures). */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Global error handler — must be registered last in Express after all routes. */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  const isDev = ENV.NODE_ENV === 'development';

  logger.error(err);

  res.status(500).json({
    message: 'Internal server error',
    ...(isDev && { detail: err instanceof Error ? err.message : String(err) }),
  });
}
