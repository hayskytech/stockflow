import { Router } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createStock, deleteStock, getStock, importStock, listStock } from './stock.controller.js';

export const stockRouter = Router();

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
  sortable: ['quantity', 'invoice_no', 'invoice_date', 'mrp', 'wsp', 'created_at'],
  defaultSort: 'created_at',
});

// Stock is back-office only — see CLAUDE.md permission matrix (customers never see it).
stockRouter.get('/', authenticate, requireRole('admin', 'staff'), stockPagination, listStock);
stockRouter.get('/:id', authenticate, requireRole('admin', 'staff'), getStock);
stockRouter.post('/', authenticate, requireRole('admin', 'staff'), createStock);
stockRouter.post('/import', authenticate, requireRole('admin', 'staff'), handleUpload, importStock);
stockRouter.delete('/:id', authenticate, requireRole('admin', 'staff'), deleteStock);
