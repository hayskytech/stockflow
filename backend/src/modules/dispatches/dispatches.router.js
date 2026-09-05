import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { createDispatch, getDispatch, listDispatches } from './dispatches.controller.js';

// Mounted in app.js at /api/b/:businessId/dispatches behind `authenticate, resolveBusiness`, so
// businessId comes from the route param (mergeParams) and every request is an authenticated member.
export const dispatchesRouter = Router({ mergeParams: true });

const dispatchesPagination = pagination({
  sortable: ['created_at', 'dispatch_number'],
  defaultSort: 'created_at',
});

// Dispatches are back-office only — any admin/staff member of the business.
dispatchesRouter.get('/', requireBusinessRole('admin', 'staff'), dispatchesPagination, listDispatches);
dispatchesRouter.get('/:id', requireBusinessRole('admin', 'staff'), getDispatch);
dispatchesRouter.post('/', requireBusinessRole('admin', 'staff'), createDispatch);
