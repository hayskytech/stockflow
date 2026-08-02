import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
const moneyField = z.number().nonnegative('Must be zero or greater').max(10000000, 'Must be 1,00,00,000 or less');
const discountPercentField = z.number().min(0, 'Must be zero or greater').max(100, 'Must be 100 or less');
const reorderLevelField = z.number().int().nonnegative('Must be zero or greater').max(100000, 'Must be 1,00,000 or less');

/** Optional first stock batch created in the same request as the product. Uses the
 *  product's own price/discountPercent/size rather than duplicating those fields here. */
const initialStockField = z
  .object({
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity cannot exceed 10000'),
    invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(100, 'Invoice number is too long'),
    invoiceDate: z.string().trim().min(1).optional().nullable(),
    note: z.string().trim().max(500, 'Note is too long').optional().nullable(),
  })
  .optional();

/** POST /api/products */
export const createProductSchema = z
  .object({
    productCode: z.string().trim().min(1, 'Product code is required').max(50, 'Product code is too long'),
    categoryId: uuidField,
    subCategoryId: uuidField.optional().nullable(),
    name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long'),
    description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
    color: z.string().trim().max(50, 'Color is too long').optional().nullable(),
    size: z.string().trim().max(20, 'Size is too long').optional().nullable(),
    price: moneyField,
    discountPercent: discountPercentField.default(0),
    reorderLevel: reorderLevelField.default(0),
    productPhotoMediaId: uuidField.optional().nullable(),
    galleryMediaIds: z.array(uuidField).max(5, 'Maximum 5 gallery images allowed').optional(),
    isActive: z.boolean().optional(),
    initialStock: initialStockField,
  });

/** PUT /api/products/:id — partial update */
export const updateProductSchema = z
  .object({
    productCode: z.string().trim().min(1).max(50).optional(),
    categoryId: uuidField.optional(),
    subCategoryId: uuidField.optional().nullable(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
    size: z.string().trim().max(20).optional().nullable(),
    price: moneyField.optional(),
    discountPercent: discountPercentField.optional(),
    reorderLevel: reorderLevelField.optional(),
    productPhotoMediaId: uuidField.optional().nullable(),
    galleryMediaIds: z.array(uuidField).max(5, 'Maximum 5 gallery images allowed').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

/** GET /api/products?category_id=&sub_category_id=&division_id=&is_active=&min_price=&max_price= */
export const listProductsQuerySchema = z
  .object({
    divisionId: uuidField.optional(),
    categoryId: uuidField.optional(),
    subCategoryId: uuidField.optional(),
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    minPrice: z.coerce.number().nonnegative('Must be zero or greater').optional(),
    maxPrice: z.coerce.number().nonnegative('Must be zero or greater').optional(),
  })
  .refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  });

export const idParamSchema = z.object({ id: uuidField });
