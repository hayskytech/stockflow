import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createCategory,
  createDivision,
  createSubCategory,
  deleteCategory,
  deleteDivision,
  deleteSubCategory,
  listCategories,
  listDivisions,
  listSubCategories,
  reorderCategories,
  reorderDivisions,
  reorderSubCategories,
  updateCategory,
  updateDivision,
  updateSubCategory,
} from './catalog.controller.js';

export const catalogRouter = Router();

const divisionPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });
const categoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });
const subCategoryPagination = pagination({ sortable: ['name', 'sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Divisions — reads are public (storefront filter sidebar needs no login), writes admin-only.
// `/reorder` is declared before `/:id` so it's never captured by that param route.
catalogRouter.get('/divisions', divisionPagination, listDivisions);
catalogRouter.post('/divisions', authenticate, requireRole('admin'), createDivision);
catalogRouter.patch('/divisions/reorder', authenticate, requireRole('admin'), reorderDivisions);
catalogRouter.put('/divisions/:id', authenticate, requireRole('admin'), updateDivision);
catalogRouter.delete('/divisions/:id', authenticate, requireRole('admin'), deleteDivision);

// Categories
catalogRouter.get('/categories', categoryPagination, listCategories);
catalogRouter.post('/categories', authenticate, requireRole('admin'), createCategory);
catalogRouter.patch('/categories/reorder', authenticate, requireRole('admin'), reorderCategories);
catalogRouter.put('/categories/:id', authenticate, requireRole('admin'), updateCategory);
catalogRouter.delete('/categories/:id', authenticate, requireRole('admin'), deleteCategory);

// Sub-categories
catalogRouter.get('/sub-categories', subCategoryPagination, listSubCategories);
catalogRouter.post('/sub-categories', authenticate, requireRole('admin'), createSubCategory);
catalogRouter.patch('/sub-categories/reorder', authenticate, requireRole('admin'), reorderSubCategories);
catalogRouter.put('/sub-categories/:id', authenticate, requireRole('admin'), updateSubCategory);
catalogRouter.delete('/sub-categories/:id', authenticate, requireRole('admin'), deleteSubCategory);
