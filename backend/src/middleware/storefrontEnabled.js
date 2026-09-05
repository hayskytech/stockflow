import { ENV } from '../config/env.js';
import { AppError } from './errorHandler.js';

/**
 * Gates storefront / customer-facing routes behind the STOREFRONT_ENABLED flag.
 * When the storefront is disabled (multi-tenant migration Phase 1), these routes
 * respond exactly as if they did not exist. Kept as a guard so the code stays intact
 * and re-enabling is a single env change.
 */
export function storefrontEnabled(_req, _res, next) {
  if (!ENV.STOREFRONT_ENABLED) {
    throw new AppError(404, 'Not found');
  }
  next();
}
