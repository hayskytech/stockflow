import { AppError } from './errorHandler.js';

/** Restricts a route to specific roles, e.g. requireRole('admin'). Must run after authenticate. */
export function requireRole(...allowedRoles) {
  return function (req, _res, next) {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}
