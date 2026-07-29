import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createDispatch, getDispatch, listDispatches } from './dispatches.controller.js';

export const dispatchesRouter = Router();

const dispatchesPagination = pagination({
  sortable: ['created_at', 'dispatch_number'],
  defaultSort: 'created_at',
});

// Dispatches are back-office only — see CLAUDE.md permission matrix (customers never see them).
dispatchesRouter.get('/', authenticate, requireRole('admin', 'staff'), dispatchesPagination, listDispatches);
dispatchesRouter.get('/:id', authenticate, requireRole('admin', 'staff'), getDispatch);
dispatchesRouter.post('/', authenticate, requireRole('admin', 'staff'), createDispatch);
