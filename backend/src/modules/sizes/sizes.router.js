import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createSize, deleteSize, listSizes, reorderSizes, updateSize } from './sizes.controller.js';

export const sizesRouter = Router();

const sizesPagination = pagination({ sortable: ['value', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Not customer-facing (only the product/stock forms use this), so reads require a session too —
// unlike catalog's categories, which the public storefront filter sidebar needs.
// `/reorder` is declared before `/:id` so it's never captured by that param route.
sizesRouter.get('/', authenticate, requireRole('admin', 'staff'), sizesPagination, listSizes);
sizesRouter.post('/', authenticate, requireRole('admin'), createSize);
sizesRouter.patch('/reorder', authenticate, requireRole('admin'), reorderSizes);
sizesRouter.put('/:id', authenticate, requireRole('admin'), updateSize);
sizesRouter.delete('/:id', authenticate, requireRole('admin'), deleteSize);
