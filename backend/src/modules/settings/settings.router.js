import { Router } from 'express';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { storefrontEnabled } from '../../middleware/storefrontEnabled.js';
import {
  deleteAllData,
  getPublicSiteBranding,
  getPublicSocialLinks,
  getSiteBranding,
  getSocialLinks,
  updateSiteBranding,
  updateSocialLinks,
} from './settings.controller.js';

// Tenant router — mounted in app.js at /api/b/:businessId/settings behind `authenticate,
// resolveBusiness`. Reads are open to any member; writes are admin-only.
export const settingsRouter = Router({ mergeParams: true });

settingsRouter.get('/social', getSocialLinks);
settingsRouter.put('/social', requireBusinessRole('admin'), updateSocialLinks);

settingsRouter.get('/branding', getSiteBranding);
settingsRouter.put('/branding', requireBusinessRole('admin'), updateSiteBranding);

// Destructive dev-only reset of this business's data — admin only; the controller additionally
// rejects the request outright unless NODE_ENV is 'development'.
settingsRouter.post('/delete-all-data', requireBusinessRole('admin'), deleteAllData);

// Public router — mounted flat at /api/settings, only exposes /social/public and /branding/public.
// Still gated by storefrontEnabled (returns 404), so its handlers never actually run while the
// storefront is off.
export const settingsPublicRouter = Router();
settingsPublicRouter.get('/social/public', storefrontEnabled, getPublicSocialLinks);
settingsPublicRouter.get('/branding/public', storefrontEnabled, getPublicSiteBranding);
