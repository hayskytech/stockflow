import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getMonthlyOrderSummary, getOrderHistory, getStockMovement, getStockSummary } from './reports.controller.js';

export const reportsRouter = Router();

// Reports are admin/staff only — see CLAUDE.md permission matrix (customers never see them).
reportsRouter.get('/stock-summary', authenticate, requireRole('admin', 'staff'), getStockSummary);
reportsRouter.get('/order-history', authenticate, requireRole('admin', 'staff'), getOrderHistory);
reportsRouter.get('/stock-movement', authenticate, requireRole('admin', 'staff'), getStockMovement);
reportsRouter.get('/monthly-orders', authenticate, requireRole('admin', 'staff'), getMonthlyOrderSummary);
