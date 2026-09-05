import { z } from 'zod';

const nameField = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');
const uuidField = z.string().uuid('Invalid id');

/** POST /api/categories */
export const createCategorySchema = z.object({
  name: nameField,
  isActive: z.boolean().optional(),
});

/** PUT /api/categories/:id */
export const updateCategorySchema = createCategorySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

const isActiveQueryField = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

/** GET /api/categories?is_active=... */
export const listCategoriesQuerySchema = z.object({
  isActive: isActiveQueryField,
});

/** POST /api/sub-categories */
export const createSubCategorySchema = z.object({
  categoryId: uuidField,
  name: nameField,
  isActive: z.boolean().optional(),
});

/** PUT /api/sub-categories/:id */
export const updateSubCategorySchema = createSubCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

/** GET /api/sub-categories?category_id=&is_active=... */
export const listSubCategoriesQuerySchema = z.object({
  categoryId: uuidField.optional(),
  isActive: isActiveQueryField,
});

export const idParamSchema = z.object({ id: uuidField });

/** PATCH /api/categories/reorder — full ordered list of every category id */
export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});

/** PATCH /api/sub-categories/reorder — full ordered list of every sub-category id within one category */
export const reorderSubCategoriesSchema = z.object({
  categoryId: uuidField,
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});
