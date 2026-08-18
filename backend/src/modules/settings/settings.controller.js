import { ENV } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { deleteAllDataSchema, updateSiteBrandingSchema, updateSocialLinksSchema } from './settings.schema.js';
import * as settingsService from './settings.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** POST /api/settings/delete-all-data — dev-only destructive reset (blocked outside development). */
export async function deleteAllData(req, res, next) {
  try {
    if (ENV.NODE_ENV !== 'development') {
      throw new AppError(403, 'Deleting all data is only available in development mode');
    }
    parseOrThrow(deleteAllDataSchema, req.body);
    const deleted = await settingsService.deleteAllData();
    res.status(200).json({ deleted });
  } catch (err) {
    next(err);
  }
}

/** GET /api/settings/social */
export async function getSocialLinks(req, res, next) {
  try {
    const socialLinks = await settingsService.getSocialLinks();
    res.status(200).json(socialLinks);
  } catch (err) {
    next(err);
  }
}

/** GET /api/settings/social/public — unauthenticated, feeds the storefront footer */
export async function getPublicSocialLinks(req, res, next) {
  try {
    const socialLinks = await settingsService.getPublicSocialLinks();
    res.status(200).json(socialLinks);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/settings/social */
export async function updateSocialLinks(req, res, next) {
  try {
    const input = parseOrThrow(updateSocialLinksSchema, req.body);
    const socialLinks = await settingsService.updateSocialLinks(input);
    res.status(200).json(socialLinks);
  } catch (err) {
    next(err);
  }
}

/** GET /api/settings/branding */
export async function getSiteBranding(req, res, next) {
  try {
    const branding = await settingsService.getSiteBranding();
    res.status(200).json(branding);
  } catch (err) {
    next(err);
  }
}

/** GET /api/settings/branding/public — unauthenticated, feeds the storefront header (logo) and browser tab (favicon) */
export async function getPublicSiteBranding(req, res, next) {
  try {
    const branding = await settingsService.getPublicSiteBranding();
    res.status(200).json(branding);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/settings/branding */
export async function updateSiteBranding(req, res, next) {
  try {
    const input = parseOrThrow(updateSiteBrandingSchema, req.body);
    const branding = await settingsService.updateSiteBranding(input);
    res.status(200).json(branding);
  } catch (err) {
    next(err);
  }
}
