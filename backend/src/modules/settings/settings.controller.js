import { ENV } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { deleteAllDataSchema } from './settings.schema.js';
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
