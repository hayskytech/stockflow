import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getNotice, getPublicNotice, updateNotice } from './notice.controller.js';

export const noticeRouter = Router();

// Public — no auth: the storefront (including guests) needs the scrolling notice.
noticeRouter.get('/public', getPublicNotice);
noticeRouter.get('/', authenticate, getNotice);
noticeRouter.put('/', authenticate, requireRole('admin'), updateNotice);
