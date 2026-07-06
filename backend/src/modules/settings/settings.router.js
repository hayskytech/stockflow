import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { deleteAllData } from './settings.controller.js';

export const settingsRouter = Router();

// Destructive dev-only reset — admin only; the controller additionally rejects
// the request outright unless NODE_ENV is 'development'.
settingsRouter.post('/delete-all-data', authenticate, requireRole('admin'), deleteAllData);
