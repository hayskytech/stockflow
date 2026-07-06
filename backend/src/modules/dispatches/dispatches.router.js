import { Router } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { barcodeStatus, createDispatch, getDispatch, importDispatch, listDispatches } from './dispatches.controller.js';

export const dispatchesRouter = Router();

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.csv']);

// Memory storage: the buffer is parsed in-process (never written to disk) by dispatches.service.js.
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

const dispatchesPagination = pagination({
  sortable: ['created_at', 'dispatch_number'],
  defaultSort: 'created_at',
});

// Dispatches are back-office only — see CLAUDE.md permission matrix (customers never see them).
dispatchesRouter.get('/', authenticate, requireRole('admin', 'staff'), dispatchesPagination, listDispatches);
dispatchesRouter.get('/:id', authenticate, requireRole('admin', 'staff'), getDispatch);
dispatchesRouter.post('/', authenticate, requireRole('admin', 'staff'), createDispatch);
dispatchesRouter.post('/barcode-status', authenticate, requireRole('admin', 'staff'), barcodeStatus);
dispatchesRouter.post('/import', authenticate, requireRole('admin', 'staff'), handleUpload, importDispatch);
