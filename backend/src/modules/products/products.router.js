import { Router } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createProduct,
  deleteProduct,
  downloadProductImportTemplate,
  getProduct,
  importProducts,
  listProducts,
  updateProduct,
} from './products.controller.js';

export const productsRouter = Router();

const productsPagination = pagination({
  sortable: ['name', 'product_code', 'price', 'discount_percent', 'quantity_available', 'created_at'],
  defaultSort: 'created_at',
});

const ALLOWED_IMPORT_EXTENSIONS = new Set(['.xlsx', '.csv']);

// Memory storage: the buffer is parsed in-process (never written to disk) by products.service.js.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ENV.STOCK_IMPORT_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMPORT_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
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

// Reads are public (storefront browsing needs no login); writes stay admin/staff-only.
// import-template must come before /:id so "import-template" isn't parsed as a product id.
productsRouter.get('/', productsPagination, listProducts);
productsRouter.get('/import-template', authenticate, requireRole('admin', 'staff'), downloadProductImportTemplate);
productsRouter.get('/:id', getProduct);
productsRouter.post('/', authenticate, requireRole('admin', 'staff'), createProduct);
productsRouter.post('/import', authenticate, requireRole('admin', 'staff'), handleUpload, importProducts);
productsRouter.put('/:id', authenticate, requireRole('admin', 'staff'), updateProduct);
productsRouter.delete('/:id', authenticate, requireRole('admin', 'staff'), deleteProduct);
