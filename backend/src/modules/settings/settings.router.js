import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  deleteAllData,
  getPublicSiteBranding,
  getPublicSocialLinks,
  getSiteBranding,
  getSocialLinks,
  updateSiteBranding,
  updateSocialLinks,
} from './settings.controller.js';

export const settingsRouter = Router();

// Public — no auth: the storefront footer needs the social links for every visitor.
settingsRouter.get('/social/public', getPublicSocialLinks);
settingsRouter.get('/social', authenticate, getSocialLinks);
settingsRouter.put('/social', authenticate, requireRole('admin'), updateSocialLinks);

// Public — no auth: the storefront header (logo) and browser tab (favicon) need this for every visitor.
settingsRouter.get('/branding/public', getPublicSiteBranding);
settingsRouter.get('/branding', authenticate, getSiteBranding);
settingsRouter.put('/branding', authenticate, requireRole('admin'), updateSiteBranding);

// Destructive dev-only reset — admin only; the controller additionally rejects
// the request outright unless NODE_ENV is 'development'.
settingsRouter.post('/delete-all-data', authenticate, requireRole('admin'), deleteAllData);
