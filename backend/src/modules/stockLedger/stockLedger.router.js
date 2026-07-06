import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listStockLedger } from './stockLedger.controller.js';

export const stockLedgerRouter = Router();

const stockLedgerPagination = pagination({
  sortable: ['created_at', 'quantity'],
  defaultSort: 'created_at',
});

// Read-only append-only log — back-office only, no write routes.
stockLedgerRouter.get('/', authenticate, requireRole('admin', 'staff'), stockLedgerPagination, listStockLedger);
