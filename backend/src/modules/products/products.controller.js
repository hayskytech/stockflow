import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { createProductSchema, idParamSchema, listProductsQuerySchema, updateProductSchema } from './products.schema.js';
import * as productsService from './products.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/products */
export async function listProducts(req, res, next) {
  try {
    const filters = parseOrThrow(listProductsQuerySchema, {
      categoryId: req.query.category_id,
      subCategoryId: req.query.sub_category_id,
      isActive: req.query.is_active,
      minPrice: req.query.min_price,
      maxPrice: req.query.max_price,
    });
    const { rows, total } = await productsService.listProducts(req.business.id, req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/products/:id */
export async function getProduct(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const product = await productsService.getProductById(req.business.id, id);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/products */
export async function createProduct(req, res, next) {
  try {
    const input = parseOrThrow(createProductSchema, req.body);
    const product = await productsService.createProduct(req.business.id, input);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/b/:businessId/products/:id */
export async function updateProduct(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateProductSchema, req.body);
    const product = await productsService.updateProduct(req.business.id, id, input);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/products/:id */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await productsService.deleteProduct(req.business.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/products/import */
export async function importProducts(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const result = await productsService.importProducts(req.business.id, req.file.buffer, req.file.originalname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/products/import-template */
export async function downloadProductImportTemplate(req, res, next) {
  try {
    const buffer = await productsService.getProductImportTemplate();
    res.status(200);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
