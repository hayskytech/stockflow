import { executeQuery } from '../db/query.js';
import { AppError } from './errorHandler.js';

/**
 * Resolves the tenant business for a route nested under `/api/b/:businessId/...` (mounted with
 * `Router({ mergeParams: true })`) and the caller's role within it.
 *
 * Unlike the token-only authorization checks, this DOES hit the DB — one indexed lookup on
 * `businesses` — so a deactivated business or a revoked membership stops protecting stale tenant
 * data within the request itself, not only on the next token refresh (plan §1.3).
 *
 * On success sets:
 *   req.business   = { id }
 *   req.membership = { businessId, role }   // role: 'admin' | 'staff'
 *
 * Runs after `authenticate`. Errors: 400 (no business in route), 404 (unknown/inactive business),
 * 403 (authenticated but not a member and not a super admin).
 */
export async function resolveBusiness(req, _res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const businessId = req.params.businessId;
    if (!businessId) throw new AppError(400, 'Business context required');

    const [business] = await executeQuery(
      `SELECT id, is_active FROM businesses WHERE id = ?`,
      [businessId],
    );

    if (!business) throw new AppError(404, 'Business not found');

    // A deactivated business is invisible to everyone except a super admin, who may still act on it
    // (to re-enable it, wind it down, etc.) — the context is still set in that case.
    if (!business.is_active && !req.user.isSuperAdmin) {
      throw new AppError(404, 'Business not found');
    }

    const membership = (req.user.memberships ?? []).find((m) => m.b === businessId);

    if (membership) {
      req.membership = { businessId, role: membership.r };
    } else if (req.user.isSuperAdmin) {
      // Synthetic: a super admin who is not an explicit member still acts as an admin here.
      req.membership = { businessId, role: 'admin' };
    } else {
      throw new AppError(403, 'You are not a member of this business');
    }

    req.business = { id: businessId };
    next();
  } catch (err) {
    next(err);
  }
}
