import { z } from 'zod';

const nameField = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');
const uuidField = z.string().uuid('Invalid id');

/** POST /api/divisions */
export const createDivisionSchema = z.object({
  name: nameField,
  isActive: z.boolean().optional(),
});

/** PUT /api/divisions/:id — all fields optional, but at least one must be present */
export const updateDivisionSchema = createDivisionSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

/** POST /api/categories */
export const createCategorySchema = z.object({
  divisionId: uuidField,
  name: nameField,
  isActive: z.boolean().optional(),
});

/** PUT /api/categories/:id */
export const updateCategorySchema = createCategorySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

/** GET /api/categories?division_id=... */
export const listCategoriesQuerySchema = z.object({
  divisionId: uuidField.optional(),
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

/** GET /api/sub-categories?category_id=... */
export const listSubCategoriesQuerySchema = z.object({
  categoryId: uuidField.optional(),
});

export const idParamSchema = z.object({ id: uuidField });

/** PATCH /api/divisions/reorder — full ordered list of every division id */
export const reorderDivisionsSchema = z.object({
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});

/** PATCH /api/categories/reorder — full ordered list of every category id within one division */
export const reorderCategoriesSchema = z.object({
  divisionId: uuidField,
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});

/** PATCH /api/sub-categories/reorder — full ordered list of every sub-category id within one category */
export const reorderSubCategoriesSchema = z.object({
  categoryId: uuidField,
  orderedIds: z.array(uuidField).min(1, 'At least one id is required'),
});
