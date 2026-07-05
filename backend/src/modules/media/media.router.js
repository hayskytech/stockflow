import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  attachUsage,
  deleteMedia,
  detachUsage,
  getMedia,
  listMedia,
  renameMedia,
  sweepOrphans,
  uploadMedia,
} from './media.controller.js';

export const mediaRouter = Router();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Memory storage: the buffer is validated and re-encoded by sharp before anything ever
// touches disk — the client-supplied file is never written to the filesystem as-is.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ENV.MEDIA_MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Only JPEG, PNG, WebP or GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

const mediaPagination = pagination({
  sortable: ['created_at', 'size_bytes'],
  defaultSort: 'created_at',
});

/** Converts multer's own errors (file too large, wrong field, etc.) into AppError for the global handler. */
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(400, `File exceeds the ${ENV.MEDIA_MAX_UPLOAD_MB}MB upload limit`));
    }
    return next(new AppError(400, 'Upload failed'));
  });
}

mediaRouter.get('/', authenticate, mediaPagination, listMedia);
mediaRouter.get('/:id', authenticate, getMedia);
mediaRouter.post('/', authenticate, requireRole('admin', 'staff'), handleUpload, uploadMedia);
mediaRouter.patch('/:id', authenticate, requireRole('admin', 'staff'), renameMedia);
mediaRouter.post('/:id/usage', authenticate, requireRole('admin', 'staff'), attachUsage);
mediaRouter.delete('/:id/usage', authenticate, requireRole('admin', 'staff'), detachUsage);
mediaRouter.delete('/:id', authenticate, requireRole('admin', 'staff'), deleteMedia);
mediaRouter.post('/sweep-orphans', authenticate, requireRole('admin'), sweepOrphans);
