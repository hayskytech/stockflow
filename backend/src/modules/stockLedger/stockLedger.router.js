import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { listStockLedger } from './stockLedger.controller.js';

// Mounted in app.js at /api/b/:businessId/stock-ledger behind `authenticate, resolveBusiness`.
export const stockLedgerRouter = Router({ mergeParams: true });

const stockLedgerPagination = pagination({
  sortable: ['created_at', 'quantity'],
  defaultSort: 'created_at',
});

// Read-only append-only log — back-office only (any admin/staff of the business), no write routes.
stockLedgerRouter.get('/', requireBusinessRole('admin', 'staff'), stockLedgerPagination, listStockLedger);
