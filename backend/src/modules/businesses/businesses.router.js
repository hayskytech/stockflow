import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireSuperAdmin } from '../../middleware/requireSuperAdmin.js';
import {
  addMember,
  createBusiness,
  deactivateBusiness,
  getBusiness,
  listBusinesses,
  listMembers,
  listMembersForBusiness,
  removeMember,
  updateBusiness,
  updateMemberRole,
} from './businesses.controller.js';

const businessesPagination = pagination({
  sortable: ['name', 'slug', 'created_at'],
  defaultSort: 'name',
});

const membersPagination = pagination({
  sortable: ['name', 'email', 'role', 'created_at'],
  defaultSort: 'created_at',
});

/**
 * /api/businesses — platform super-admin surface: create / edit / deactivate businesses and
 * inspect any business's members. Every route is authenticate + requireSuperAdmin.
 */
export const businessesRouter = Router();

businessesRouter.use(authenticate, requireSuperAdmin);

businessesRouter.get('/', businessesPagination, listBusinesses);
businessesRouter.post('/', createBusiness);
businessesRouter.get('/:id', getBusiness);
businessesRouter.put('/:id', updateBusiness);
businessesRouter.delete('/:id', deactivateBusiness);
businessesRouter.get('/:id/members', membersPagination, listMembersForBusiness);

/**
 * /api/b/:businessId/members — per-business member management for a business admin (plan decision 3).
 * Mounted in app.js behind `authenticate, resolveBusiness, requireBusinessRole('admin')`, so
 * `businessId` here comes from `req.business.id`, not the route param.
 */
export const businessMembersRouter = Router({ mergeParams: true });

businessMembersRouter.get('/', membersPagination, listMembers);
businessMembersRouter.post('/', addMember);
businessMembersRouter.patch('/:userId', updateMemberRole);
businessMembersRouter.delete('/:userId', removeMember);
