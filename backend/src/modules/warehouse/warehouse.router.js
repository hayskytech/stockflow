import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getWarehouse, getPublicWarehouse, updateWarehouse } from './warehouse.controller.js';

export const warehouseRouter = Router();

// Public — no auth: login/register pages need the site name before a session exists.
warehouseRouter.get('/public', getPublicWarehouse);
// Read is open to any authenticated role — customers need bank transfer details at checkout.
warehouseRouter.get('/', authenticate, getWarehouse);
warehouseRouter.put('/', authenticate, requireRole('admin'), updateWarehouse);
