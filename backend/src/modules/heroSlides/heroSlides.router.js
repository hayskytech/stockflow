import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { storefrontEnabled } from '../../middleware/storefrontEnabled.js';
import {
  createHeroSlide,
  deleteHeroSlide,
  listHeroSlides,
  listPublicHeroSlides,
  reorderHeroSlides,
  updateHeroSlide,
} from './heroSlides.controller.js';

const heroSlidesPagination = pagination({
  sortable: ['sort_order', 'created_at', 'updated_at'],
  defaultSort: 'sort_order',
});

// Tenant router — mounted in app.js at /api/b/:businessId/hero-slides behind `authenticate,
// resolveBusiness`. All routes are admin-only, mirroring warehouse-style site settings.
export const heroSlidesRouter = Router({ mergeParams: true });

heroSlidesRouter.get('/', requireBusinessRole('admin'), heroSlidesPagination, listHeroSlides);
heroSlidesRouter.post('/', requireBusinessRole('admin'), createHeroSlide);
// `/reorder` is declared before `/:id` so it's never captured by that param route.
heroSlidesRouter.patch('/reorder', requireBusinessRole('admin'), reorderHeroSlides);
heroSlidesRouter.put('/:id', requireBusinessRole('admin'), updateHeroSlide);
heroSlidesRouter.delete('/:id', requireBusinessRole('admin'), deleteHeroSlide);

// Public router — mounted flat at /api/hero-slides, only exposes /public. Still gated by
// storefrontEnabled (returns 404), so its handler never actually runs while the storefront is off.
export const heroSlidesPublicRouter = Router();
heroSlidesPublicRouter.get('/public', storefrontEnabled, listPublicHeroSlides);
