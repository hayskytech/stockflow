import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from './products.controller.js';

export const productsRouter = Router();

const productsPagination = pagination({
  sortable: ['name', 'product_code', 'mrp', 'wsp', 'quantity_available', 'created_at'],
  defaultSort: 'created_at',
});

// Both roles can view and manage products/stock — see CLAUDE.md permission matrix.
productsRouter.get('/', authenticate, productsPagination, listProducts);
productsRouter.get('/:id', authenticate, getProduct);
productsRouter.post('/', authenticate, requireRole('admin', 'staff'), createProduct);
productsRouter.put('/:id', authenticate, requireRole('admin', 'staff'), updateProduct);
productsRouter.delete('/:id', authenticate, requireRole('admin', 'staff'), deleteProduct);
