import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { storefrontEnabled } from '../../middleware/storefrontEnabled.js';
import {
  createHeroSlide,
  deleteHeroSlide,
  listHeroSlides,
  listPublicHeroSlides,
  reorderHeroSlides,
  updateHeroSlide,
} from './heroSlides.controller.js';

export const heroSlidesRouter = Router();

const heroSlidesPagination = pagination({ sortable: ['sort_order', 'created_at', 'updated_at'], defaultSort: 'sort_order' });

// Public — no auth: the storefront homepage (including guests) needs the active slide list.
// Gated by storefrontEnabled (multi-tenant migration Phase 1).
heroSlidesRouter.get('/public', storefrontEnabled, listPublicHeroSlides);

// Admin-only management, mirroring warehouse-style site settings.
heroSlidesRouter.get('/', authenticate, requireRole('admin'), heroSlidesPagination, listHeroSlides);
heroSlidesRouter.post('/', authenticate, requireRole('admin'), createHeroSlide);
// `/reorder` is declared before `/:id` so it's never captured by that param route.
heroSlidesRouter.patch('/reorder', authenticate, requireRole('admin'), reorderHeroSlides);
heroSlidesRouter.put('/:id', authenticate, requireRole('admin'), updateHeroSlide);
heroSlidesRouter.delete('/:id', authenticate, requireRole('admin'), deleteHeroSlide);
