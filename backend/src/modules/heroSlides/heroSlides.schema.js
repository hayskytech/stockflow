import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
const linkUrlField = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(500, 'Too long')
  .optional()
  .or(z.literal(''));

/** POST /api/hero-slides */
export const createHeroSlideSchema = z.object({
  mediaId: uuidField,
  linkUrl: linkUrlField,
  isActive: z.boolean().optional(),
});

/** PUT /api/hero-slides/:id — all fields optional, but at least one must be present */
export const updateHeroSlideSchema = createHeroSlideSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

export const idParamSchema = z.object({ id: uuidField });

/** PATCH /api/hero-slides/reorder — full ordered list of every slide id */
export const reorderHeroSlidesSchema = z.object({
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});
