import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
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

export const catalogRouter = Router();

const categoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });
const subCategoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Categories — top-level of the product tree. Reads are public (storefront filter
// sidebar needs no login), writes admin-only. `/reorder` is declared before `/:id`
// so it's never captured by that param route.
catalogRouter.get('/categories', categoryPagination, listCategories);
catalogRouter.post('/categories', authenticate, requireRole('admin'), createCategory);
catalogRouter.patch('/categories/reorder', authenticate, requireRole('admin'), reorderCategories);
catalogRouter.get('/categories/:id', getCategory);
catalogRouter.put('/categories/:id', authenticate, requireRole('admin'), updateCategory);
catalogRouter.delete('/categories/:id', authenticate, requireRole('admin'), deleteCategory);

// Sub-categories
catalogRouter.get('/sub-categories', subCategoryPagination, listSubCategories);
catalogRouter.post('/sub-categories', authenticate, requireRole('admin'), createSubCategory);
catalogRouter.patch('/sub-categories/reorder', authenticate, requireRole('admin'), reorderSubCategories);
catalogRouter.put('/sub-categories/:id', authenticate, requireRole('admin'), updateSubCategory);
catalogRouter.delete('/sub-categories/:id', authenticate, requireRole('admin'), deleteSubCategory);
