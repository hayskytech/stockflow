import { Router } from 'express';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { storefrontEnabled } from '../../middleware/storefrontEnabled.js';
import { getNotice, getPublicNotice, updateNotice } from './notice.controller.js';

// Tenant router — mounted in app.js at /api/b/:businessId/notice behind `authenticate,
// resolveBusiness`. Read is open to any member; write is admin-only.
export const noticeRouter = Router({ mergeParams: true });
noticeRouter.get('/', getNotice);
noticeRouter.put('/', requireBusinessRole('admin'), updateNotice);

// Public router — mounted flat at /api/notice, only exposes /public. Still gated by
// storefrontEnabled (returns 404), so its handler never actually runs while the storefront is off.
export const noticePublicRouter = Router();
noticePublicRouter.get('/public', storefrontEnabled, getPublicNotice);
