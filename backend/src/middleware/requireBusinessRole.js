import { AppError } from './errorHandler.js';

/**
 * Restricts a tenant route to specific business roles, e.g. requireBusinessRole('admin').
 * Must run AFTER resolveBusiness, which sets req.membership from the caller's membership (or a
 * synthetic 'admin' for a super admin).
 */
export function requireBusinessRole(...allowedRoles) {
  return function (req, _res, next) {
    if (!req.membership) throw new AppError(403, 'Business context not resolved');
    if (!allowedRoles.includes(req.membership.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}
