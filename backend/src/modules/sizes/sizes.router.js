import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { createSize, deleteSize, listSizes, reorderSizes, updateSize } from './sizes.controller.js';

// Mounted in app.js at /api/b/:businessId/sizes behind `authenticate, resolveBusiness`.
export const sizesRouter = Router({ mergeParams: true });

const sizesPagination = pagination({ sortable: ['value', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Reads are member-only (any admin/staff of the business); writes are admin-only.
// `/reorder` is declared before `/:id` so it's never captured by that param route.
sizesRouter.get('/', sizesPagination, listSizes);
sizesRouter.post('/', requireBusinessRole('admin'), createSize);
sizesRouter.patch('/reorder', requireBusinessRole('admin'), reorderSizes);
sizesRouter.put('/:id', requireBusinessRole('admin'), updateSize);
sizesRouter.delete('/:id', requireBusinessRole('admin'), deleteSize);
