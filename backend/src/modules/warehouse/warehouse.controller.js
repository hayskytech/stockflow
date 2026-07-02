import { AppError } from '../../middleware/errorHandler.js';
import { updateWarehouseSchema } from './warehouse.schema.js';
import * as warehouseService from './warehouse.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/warehouse */
export async function getWarehouse(req, res, next) {
  try {
    const warehouse = await warehouseService.getWarehouse();
    res.status(200).json(warehouse);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/warehouse */
export async function updateWarehouse(req, res, next) {
  try {
    const input = parseOrThrow(updateWarehouseSchema, req.body);
    const warehouse = await warehouseService.updateWarehouse(input);
    res.status(200).json(warehouse);
  } catch (err) {
    next(err);
  }
}
