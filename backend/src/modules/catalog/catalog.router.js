import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  getCategory,
  listCategories,
  listSubCategories,
  reorderCategories,
  reorderSubCategories,
  updateCategory,
  updateSubCategory,
} from './catalog.controller.js';

// Mounted in app.js at /api/b/:businessId behind `authenticate, resolveBusiness`, so businessId
// comes from the route param (mergeParams) and every request already has an authenticated member.
export const catalogRouter = Router({ mergeParams: true });

const categoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });
const subCategoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Categories — top-level of the product tree. Reads are member-only (any admin/staff of the
// business), writes admin-only. `/reorder` is declared before `/:id` so it's never captured by
// that param route.
catalogRouter.get('/categories', categoryPagination, listCategories);
catalogRouter.post('/categories', requireBusinessRole('admin'), createCategory);
catalogRouter.patch('/categories/reorder', requireBusinessRole('admin'), reorderCategories);
catalogRouter.get('/categories/:id', getCategory);
catalogRouter.put('/categories/:id', requireBusinessRole('admin'), updateCategory);
catalogRouter.delete('/categories/:id', requireBusinessRole('admin'), deleteCategory);

// Sub-categories
catalogRouter.get('/sub-categories', subCategoryPagination, listSubCategories);
catalogRouter.post('/sub-categories', requireBusinessRole('admin'), createSubCategory);
catalogRouter.patch('/sub-categories/reorder', requireBusinessRole('admin'), reorderSubCategories);
catalogRouter.put('/sub-categories/:id', requireBusinessRole('admin'), updateSubCategory);
catalogRouter.delete('/sub-categories/:id', requireBusinessRole('admin'), deleteSubCategory);
