import { AppError } from '../../middleware/errorHandler.js';
import { updateBusinessSettingsSchema } from './business-settings.schema.js';
import * as businessSettingsService from './business-settings.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/business-settings */
export async function getBusinessSettings(req, res, next) {
  try {
    const settings = await businessSettingsService.getBusinessSettings(req.business.id);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/b/:businessId/business-settings */
export async function updateBusinessSettings(req, res, next) {
  try {
    const input = parseOrThrow(updateBusinessSettingsSchema, req.body);
    const settings = await businessSettingsService.updateBusinessSettings(req.business.id, input);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}
