import { AppError } from './errorHandler.js';

/**
 * Restricts a route to platform super admins (`users.is_super_admin`). Must run after authenticate,
 * which puts `isSuperAdmin` on req.user from the access-token payload.
 */
export function requireSuperAdmin(req, _res, next) {
  if (req.user?.isSuperAdmin !== true) {
    throw new AppError(403, 'Super admin access required');
  }
  next();
}
