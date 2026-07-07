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
  updateCategory,
  updateDivision,
  updateSubCategory,
} from './catalog.controller.js';

export const catalogRouter = Router();

const divisionPagination = pagination({ sortable: ['name', 'created_at', 'updated_at'], defaultSort: 'name' });
const categoryPagination = pagination({ sortable: ['name', 'created_at', 'updated_at'], defaultSort: 'name' });
const subCategoryPagination = pagination({ sortable: ['name', 'created_at', 'updated_at'], defaultSort: 'name' });

// Divisions — reads are public (storefront filter sidebar needs no login), writes admin-only.
catalogRouter.get('/divisions', divisionPagination, listDivisions);
catalogRouter.post('/divisions', authenticate, requireRole('admin'), createDivision);
catalogRouter.put('/divisions/:id', authenticate, requireRole('admin'), updateDivision);
catalogRouter.delete('/divisions/:id', authenticate, requireRole('admin'), deleteDivision);

// Categories
catalogRouter.get('/categories', categoryPagination, listCategories);
catalogRouter.post('/categories', authenticate, requireRole('admin'), createCategory);
catalogRouter.put('/categories/:id', authenticate, requireRole('admin'), updateCategory);
catalogRouter.delete('/categories/:id', authenticate, requireRole('admin'), deleteCategory);

// Sub-categories
catalogRouter.get('/sub-categories', subCategoryPagination, listSubCategories);
catalogRouter.post('/sub-categories', authenticate, requireRole('admin'), createSubCategory);
catalogRouter.put('/sub-categories/:id', authenticate, requireRole('admin'), updateSubCategory);
catalogRouter.delete('/sub-categories/:id', authenticate, requireRole('admin'), deleteSubCategory);
