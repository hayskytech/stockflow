import { Router } from 'express';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { getMonthlyOrderSummary, getOrderHistory, getStockMovement, getStockSummary } from './reports.controller.js';

// Mounted in app.js at /api/b/:businessId/reports behind `authenticate, resolveBusiness`, so
// businessId comes from the route param (mergeParams) and every request is an authenticated member.
export const reportsRouter = Router({ mergeParams: true });

// Reports are admin/staff only — see CLAUDE.md permission matrix (customers never see them).
reportsRouter.get('/stock-summary', requireBusinessRole('admin', 'staff'), getStockSummary);
reportsRouter.get('/order-history', requireBusinessRole('admin', 'staff'), getOrderHistory);
reportsRouter.get('/stock-movement', requireBusinessRole('admin', 'staff'), getStockMovement);
reportsRouter.get('/monthly-orders', requireBusinessRole('admin', 'staff'), getMonthlyOrderSummary);
