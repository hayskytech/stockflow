import { z } from 'zod';

const valueField = z.string().trim().min(1, 'Size is required').max(20, 'Size is too long');
const uuidField = z.string().uuid('Invalid id');

/** POST /api/sizes */
export const createSizeSchema = z.object({
  value: valueField,
  isActive: z.boolean().optional(),
});

/** PUT /api/sizes/:id — all fields optional, but at least one must be present */
export const updateSizeSchema = createSizeSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

/** PATCH /api/sizes/reorder — full ordered list of every size id */
export const reorderSizesSchema = z.object({
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});

export const idParamSchema = z.object({ id: uuidField });
