import { Router } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { ENV } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import {
  createStock,
  deleteStock,
  downloadStockImportTemplate,
  getStock,
  importStock,
  listStock,
} from './stock.controller.js';

// Mounted in app.js at /api/b/:businessId/stock behind `authenticate, resolveBusiness`, so businessId
// comes from the route param (mergeParams) and every request already has an authenticated member.
export const stockRouter = Router({ mergeParams: true });

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.csv']);

// Memory storage: the buffer is parsed in-process (never written to disk) by stock.service.js.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ENV.STOCK_IMPORT_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
      cb(new AppError(400, 'Only .xlsx or .csv files are allowed'));
      return;
    }
    cb(null, true);
  },
});

/** Converts multer's own errors (file too large, wrong field, etc.) into AppError for the global handler. */
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(400, `File exceeds the ${ENV.STOCK_IMPORT_MAX_MB}MB upload limit`));
    }
    return next(new AppError(400, 'Upload failed'));
  });
}

const stockPagination = pagination({
  sortable: ['quantity', 'invoice_no', 'invoice_date', 'price', 'discount_percent', 'created_at'],
  defaultSort: 'created_at',
});

// Stock is back-office only — any admin/staff member of the business.
// import-template must come before /:id so "import-template" isn't parsed as a stock id.
stockRouter.get('/', requireBusinessRole('admin', 'staff'), stockPagination, listStock);
stockRouter.get('/import-template', requireBusinessRole('admin', 'staff'), downloadStockImportTemplate);
stockRouter.get('/:id', requireBusinessRole('admin', 'staff'), getStock);
stockRouter.post('/', requireBusinessRole('admin', 'staff'), createStock);
stockRouter.post('/import', requireBusinessRole('admin', 'staff'), handleUpload, importStock);
stockRouter.delete('/:id', requireBusinessRole('admin', 'staff'), deleteStock);
