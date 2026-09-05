import { Router } from 'express';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { getBusinessSettings, updateBusinessSettings } from './business-settings.controller.js';

// Mounted in app.js at /api/b/:businessId/business-settings behind `authenticate, resolveBusiness`.
export const businessSettingsRouter = Router({ mergeParams: true });

// Read is open to any member (staff need bank/format details); write is admin-only.
businessSettingsRouter.get('/', getBusinessSettings);
businessSettingsRouter.put('/', requireBusinessRole('admin'), updateBusinessSettings);
