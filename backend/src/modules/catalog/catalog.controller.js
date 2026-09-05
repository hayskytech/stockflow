import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import {
  createCategorySchema,
  createSubCategorySchema,
  idParamSchema,
  listCategoriesQuerySchema,
  listSubCategoriesQuerySchema,
  reorderCategoriesSchema,
  reorderSubCategoriesSchema,
  updateCategorySchema,
  updateSubCategorySchema,
} from './catalog.schema.js';
import * as catalogService from './catalog.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** GET /api/categories */
export async function listCategories(req, res, next) {
  try {
    const filters = parseOrThrow(listCategoriesQuerySchema, {
      isActive: req.query.is_active,
    });
    const { rows, total } = await catalogService.listCategories(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/categories/:id */
export async function getCategory(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const category = await catalogService.getCategoryById(id);
    res.status(200).json(category);
  } catch (err) {
    next(err);
  }
}

/** POST /api/categories */
export async function createCategory(req, res, next) {
  try {
    const input = parseOrThrow(createCategorySchema, req.body);
    const category = await catalogService.createCategory(input);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/categories/:id */
export async function updateCategory(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateCategorySchema, req.body);
    const category = await catalogService.updateCategory(id, input);
    res.status(200).json(category);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/categories/:id */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await catalogService.deleteCategory(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/categories/reorder */
export async function reorderCategories(req, res, next) {
  try {
    const { orderedIds } = parseOrThrow(reorderCategoriesSchema, req.body);
    await catalogService.reorderCategories(orderedIds);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Sub-categories
// ---------------------------------------------------------------------------

/** GET /api/sub-categories */
export async function listSubCategories(req, res, next) {
  try {
    const filters = parseOrThrow(listSubCategoriesQuerySchema, {
      categoryId: req.query.category_id,
      isActive: req.query.is_active,
    });
    const { rows, total } = await catalogService.listSubCategories(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** POST /api/sub-categories */
export async function createSubCategory(req, res, next) {
  try {
    const input = parseOrThrow(createSubCategorySchema, req.body);
    const subCategory = await catalogService.createSubCategory(input);
    res.status(201).json(subCategory);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/sub-categories/:id */
export async function updateSubCategory(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateSubCategorySchema, req.body);
    const subCategory = await catalogService.updateSubCategory(id, input);
    res.status(200).json(subCategory);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/sub-categories/:id */
export async function deleteSubCategory(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await catalogService.deleteSubCategory(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sub-categories/reorder */
export async function reorderSubCategories(req, res, next) {
  try {
    const { categoryId, orderedIds } = parseOrThrow(reorderSubCategoriesSchema, req.body);
    await catalogService.reorderSubCategories(categoryId, orderedIds);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
