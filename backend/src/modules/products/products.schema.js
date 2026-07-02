import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
const moneyField = z.number().nonnegative('Must be zero or greater');

/** POST /api/products */
export const createProductSchema = z
  .object({
    productCode: z.string().trim().min(1, 'Product code is required').max(50, 'Product code is too long'),
    barcode: z.string().trim().max(50, 'Barcode is too long').optional().nullable(),
    categoryId: uuidField,
    subCategoryId: uuidField.optional().nullable(),
    name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long'),
    description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
    color: z.string().trim().max(50, 'Color is too long').optional().nullable(),
    size: z.string().trim().max(10, 'Size is too long').optional().nullable(),
    mrp: moneyField,
    wsp: moneyField,
    quantityAvailable: z.number().int().nonnegative('Must be zero or greater').default(0),
    reorderLevel: z.number().int().nonnegative('Must be zero or greater').default(0),
    unit: z.string().trim().min(1).max(20).default('pc'),
    productPhotoMediaId: uuidField.optional().nullable(),
    galleryMediaIds: z.array(uuidField).max(5, 'Maximum 5 gallery images allowed').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.wsp <= data.mrp, {
    message: 'Wholesale price (WSP) cannot be greater than MRP',
    path: ['wsp'],
  });

/** PUT /api/products/:id — partial update; wsp<=mrp checked in the service since either may be omitted */
export const updateProductSchema = z
  .object({
    productCode: z.string().trim().min(1).max(50).optional(),
    barcode: z.string().trim().max(50).optional().nullable(),
    categoryId: uuidField.optional(),
    subCategoryId: uuidField.optional().nullable(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
    size: z.string().trim().max(10).optional().nullable(),
    mrp: moneyField.optional(),
    wsp: moneyField.optional(),
    quantityAvailable: z.number().int().nonnegative().optional(),
    reorderLevel: z.number().int().nonnegative().optional(),
    unit: z.string().trim().min(1).max(20).optional(),
    productPhotoMediaId: uuidField.optional().nullable(),
    galleryMediaIds: z.array(uuidField).max(5, 'Maximum 5 gallery images allowed').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

/** GET /api/products?category_id=&sub_category_id=&division_id=&is_active= */
export const listProductsQuerySchema = z.object({
  divisionId: uuidField.optional(),
  categoryId: uuidField.optional(),
  subCategoryId: uuidField.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const idParamSchema = z.object({ id: uuidField });
