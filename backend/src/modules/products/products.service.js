import crypto from 'crypto';
import { getCategoryById, getSubCategoryById } from '../catalog/catalog.service.js';
import { attachUsage, detachUsage, getMediaById } from '../media/media.service.js';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { parseRowsFromFile } from '../../utils/importFile.js';

const MEDIA_ENTITY_TYPE = 'product';
export const MAX_GALLERY_IMAGES = 5;

/**
 * Resolves a product's photo media reference into the (mediaId, url) pair to persist,
 * and keeps media_usage in sync so the media library knows this product depends on it.
 * Pass `previousMediaId` on updates so a changed/removed photo releases its old usage row.
 * `keepMediaIds` (the product's gallery) are never detached even if replaced as the photo,
 * since they're still referenced by that other role.
 */
async function resolvePhotoMedia(productId, nextMediaId, previousMediaId, keepMediaIds = []) {
  if (nextMediaId === previousMediaId) return undefined; // no change — nothing to persist or re-link

  // Validated before detaching the old usage row, so a bad new media id 404s cleanly
  // instead of leaving the product pointing at a media item with no usage row.
  const media = nextMediaId ? await getMediaById(nextMediaId) : null;

  if (previousMediaId && !keepMediaIds.includes(previousMediaId)) {
    await detachUsage(previousMediaId, MEDIA_ENTITY_TYPE, productId);
  }
  if (!media) {
    return { productPhotoMediaId: null, productPhotoUrl: null };
  }

  await attachUsage(media.id, MEDIA_ENTITY_TYPE, productId);
  return { productPhotoMediaId: media.id, productPhotoUrl: media.url };
}

async function getGalleryImages(productId) {
  const rows = await executeQuery(
    `SELECT media_id AS mediaId, media_url AS url
       FROM product_gallery_images WHERE product_id = ? ORDER BY sort_order`,
    [productId],
  );
  return rows;
}

/**
 * Reconciles a product's gallery to exactly `nextMediaIds`, in order, keeping media_usage in
 * sync. `keepMediaId` (the product's featured photo) is never detached even if dropped from
 * the gallery, since it's still referenced by that other role.
 */
async function syncGalleryImages(productId, nextMediaIds, previousMediaIds, keepMediaId) {
  if (nextMediaIds.length > MAX_GALLERY_IMAGES) {
    throw new AppError(400, `Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`);
  }

  const nextSet = new Set(nextMediaIds);
  for (const mediaId of previousMediaIds) {
    if (nextSet.has(mediaId)) continue;
    await executeQuery(`DELETE FROM product_gallery_images WHERE product_id = ? AND media_id = ?`, [
      productId,
      mediaId,
    ]);
    if (mediaId !== keepMediaId) {
      await detachUsage(mediaId, MEDIA_ENTITY_TYPE, productId);
    }
  }

  const previousSet = new Set(previousMediaIds);
  for (let i = 0; i < nextMediaIds.length; i += 1) {
    const mediaId = nextMediaIds[i];
    if (previousSet.has(mediaId)) {
      await executeQuery(
        `UPDATE product_gallery_images SET sort_order = ? WHERE product_id = ? AND media_id = ?`,
        [i, productId, mediaId],
      );
      continue;
    }
    const media = await getMediaById(mediaId); // 404s cleanly if a bad id was sent
    await executeQuery(
      `INSERT INTO product_gallery_images (id, product_id, media_id, media_url, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), productId, media.id, media.url, i],
    );
    await attachUsage(media.id, MEDIA_ENTITY_TYPE, productId);
  }
}

const PRODUCT_COLUMNS = `
  p.id, p.product_code AS productCode, p.category_id AS categoryId,
  p.sub_category_id AS subCategoryId, p.name, p.description, p.color, p.size,
  p.mrp, p.wsp, p.quantity_available AS quantityAvailable, p.quantity_reserved AS quantityReserved,
  p.reorder_level AS reorderLevel, p.unit, p.product_photo_url AS productPhotoUrl,
  p.product_photo_media_id AS productPhotoMediaId, p.is_active AS isActive,
  p.created_at AS createdAt, p.updated_at AS updatedAt,
  c.name AS categoryName, c.division_id AS divisionId, d.name AS divisionName, sc.name AS subCategoryName
`;

const PRODUCT_JOINS = `
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN divisions d ON d.id = c.division_id
  LEFT JOIN sub_categories sc ON sc.id = p.sub_category_id
`;

// products.router.js whitelists these same keys for `orderby` — mapped here to
// qualified columns since the joined tables also have name/created_at columns.
const SORT_COLUMNS = {
  name: 'p.name',
  product_code: 'p.product_code',
  mrp: 'p.mrp',
  wsp: 'p.wsp',
  quantity_available: 'p.quantity_available',
  created_at: 'p.created_at',
};

/** Maps a MySQL error into the right AppError, or rethrows if it's not one we handle. */
function rethrowAsAppError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    throw new AppError(409, 'A product with this product code already exists');
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    throw new AppError(409, 'Cannot delete a product that is referenced by existing orders.');
  }
  throw err;
}

/** Confirms a sub-category (if given) actually belongs to the given category. */
async function assertSubCategoryBelongsToCategory(subCategoryId, categoryId) {
  if (!subCategoryId) return;
  const subCategory = await getSubCategoryById(subCategoryId); // 404s if it doesn't exist at all
  if (subCategory.categoryId !== categoryId) {
    throw new AppError(400, 'Sub-category does not belong to the selected category');
  }
}

export async function listProducts(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(p.name LIKE ? OR p.product_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (filters.divisionId) {
    conditions.push('c.division_id = ?');
    params.push(filters.divisionId);
  }
  if (filters.categoryId) {
    conditions.push('p.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.subCategoryId) {
    conditions.push('p.sub_category_id = ?');
    params.push(filters.subCategoryId);
  }
  if (filters.isActive !== undefined) {
    conditions.push('p.is_active = ?');
    params.push(filters.isActive);
  }
  if (filters.minPrice !== undefined) {
    conditions.push('p.wsp >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push('p.wsp <= ?');
    params.push(filters.maxPrice);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_JOINS} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total ${PRODUCT_JOINS} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getProductById(id) {
  const [row] = await executeQuery(`SELECT ${PRODUCT_COLUMNS} ${PRODUCT_JOINS} WHERE p.id = ?`, [id]);
  if (!row) throw new AppError(404, 'Product not found');
  const galleryImages = await getGalleryImages(id);
  return { ...row, galleryImages };
}

export async function createProduct(input) {
  await getCategoryById(input.categoryId); // 404s if the category doesn't exist
  await assertSubCategoryBelongsToCategory(input.subCategoryId, input.categoryId);

  // Validated before the insert so a bad media id 404s cleanly instead of leaving behind
  // a half-created product row with no photo.
  const photoMedia = input.productPhotoMediaId ? await getMediaById(input.productPhotoMediaId) : null;

  const galleryMediaIds = input.galleryMediaIds ?? [];
  if (galleryMediaIds.length > MAX_GALLERY_IMAGES) {
    throw new AppError(400, `Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`);
  }
  const galleryMedia = await Promise.all(galleryMediaIds.map((mediaId) => getMediaById(mediaId)));

  const id = crypto.randomUUID();
  try {
    await executeQuery(
      `INSERT INTO products (
         id, product_code, category_id, sub_category_id, name, description,
         color, size, mrp, wsp, quantity_available, reorder_level, unit,
         product_photo_media_id, product_photo_url, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.productCode,
        input.categoryId,
        input.subCategoryId ?? null,
        input.name,
        input.description ?? null,
        input.color ?? null,
        input.size ?? null,
        input.mrp,
        input.wsp,
        0, // quantity_available always starts at 0 — only Stock Import, order reserve/release, and dispatch move it
        input.reorderLevel ?? 0,
        input.unit ?? 'pc',
        photoMedia?.id ?? null,
        photoMedia?.url ?? null,
        input.isActive ?? true,
      ],
    );
  } catch (err) {
    rethrowAsAppError(err);
  }

  // Attached only after the insert succeeds, so a duplicate product_code never leaves a
  // dangling usage row pointing at a product that doesn't exist.
  if (photoMedia) {
    await attachUsage(photoMedia.id, MEDIA_ENTITY_TYPE, id);
  }
  for (let i = 0; i < galleryMedia.length; i += 1) {
    const media = galleryMedia[i];
    await executeQuery(
      `INSERT INTO product_gallery_images (id, product_id, media_id, media_url, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), id, media.id, media.url, i],
    );
    await attachUsage(media.id, MEDIA_ENTITY_TYPE, id);
  }
  return getProductById(id);
}

export async function updateProduct(id, input) {
  const existing = await getProductById(id);

  const nextCategoryId = input.categoryId ?? existing.categoryId;
  const nextSubCategoryId = input.subCategoryId !== undefined ? input.subCategoryId : existing.subCategoryId;
  const nextMrp = input.mrp !== undefined ? input.mrp : Number(existing.mrp);
  const nextWsp = input.wsp !== undefined ? input.wsp : Number(existing.wsp);

  if (nextWsp > nextMrp) {
    throw new AppError(400, 'Wholesale price (WSP) cannot be greater than MRP');
  }
  if (input.categoryId !== undefined) {
    await getCategoryById(input.categoryId); // 404s if the target category doesn't exist
  }
  if (nextSubCategoryId) {
    await assertSubCategoryBelongsToCategory(nextSubCategoryId, nextCategoryId);
  }

  const columnMap = {
    productCode: 'product_code',
    categoryId: 'category_id',
    subCategoryId: 'sub_category_id',
    name: 'name',
    description: 'description',
    color: 'color',
    size: 'size',
    mrp: 'mrp',
    wsp: 'wsp',
    reorderLevel: 'reorder_level',
    unit: 'unit',
    isActive: 'is_active',
  };

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key]);
    }
  }

  const previousGalleryMediaIds = existing.galleryImages.map((g) => g.mediaId);
  const nextGalleryMediaIds = input.galleryMediaIds !== undefined ? input.galleryMediaIds : previousGalleryMediaIds;

  let nextPhotoMediaId = existing.productPhotoMediaId;
  if (input.productPhotoMediaId !== undefined) {
    const photo = await resolvePhotoMedia(id, input.productPhotoMediaId, existing.productPhotoMediaId, nextGalleryMediaIds);
    if (photo) {
      fields.push('product_photo_media_id = ?', 'product_photo_url = ?');
      params.push(photo.productPhotoMediaId, photo.productPhotoUrl);
      nextPhotoMediaId = photo.productPhotoMediaId;
    }
  }

  if (input.galleryMediaIds !== undefined) {
    await syncGalleryImages(id, input.galleryMediaIds, previousGalleryMediaIds, nextPhotoMediaId);
  }

  if (fields.length === 0) return getProductById(id);

  params.push(id);
  try {
    await executeQuery(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getProductById(id);
}

export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (existing.productPhotoMediaId) {
    await detachUsage(existing.productPhotoMediaId, MEDIA_ENTITY_TYPE, id);
  }
  for (const gallery of existing.galleryImages) {
    await detachUsage(gallery.mediaId, MEDIA_ENTITY_TYPE, id);
  }
  try {
    await executeQuery(`DELETE FROM products WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err);
  }
}

// Division that receives categories auto-created during a product import — created on
// demand if it doesn't exist. Admin can move the categories to real divisions afterwards.
const DEFAULT_IMPORT_DIVISION = 'GENERAL';

/**
 * Bulk-creates products from an uploaded .xlsx/.csv (columns: SubGroupName, Product Code,
 * Product Name — this is the one-time catalog load, so mrp/wsp/stock aren't in the sheet and
 * are left at their defaults; edit individual products afterwards). A SubGroupName with no
 * matching category auto-creates that category under the GENERAL division. All-or-nothing:
 * if any row is invalid or has a duplicate code, the whole file is rejected.
 */
export async function importProducts(buffer, originalName) {
  const rawRows = await parseRowsFromFile(buffer, originalName);

  const errors = [];
  const parsedRows = [];
  const seenCodes = new Set();

  for (const { rowNumber, data } of rawRows) {
    const subGroupName = String(data.SubGroupName ?? '').trim();
    const productCode = String(data['Product Code'] ?? '').trim();
    const productName = String(data['Product Name'] ?? '').trim();

    if (!subGroupName || !productCode || !productName) {
      errors.push(`Row ${rowNumber}: SubGroupName, Product Code and Product Name are required`);
      continue;
    }
    if (seenCodes.has(productCode.toLowerCase())) {
      errors.push(`Row ${rowNumber}: product code "${productCode}" is duplicated in this file`);
      continue;
    }
    seenCodes.add(productCode.toLowerCase());
    parsedRows.push({ rowNumber, subGroupName, productCode, productName });
  }

  if (errors.length > 0) {
    throw new AppError(400, `Import rejected — fix these rows and re-upload: ${errors.join('; ')}`);
  }
  if (parsedRows.length === 0) {
    throw new AppError(400, 'File has no valid data rows');
  }

  const codes = parsedRows.map((r) => r.productCode);
  const existingCodes = await executeQuery(
    `SELECT product_code AS productCode FROM products WHERE product_code IN (${codes.map(() => '?').join(',')})`,
    codes,
  );
  if (existingCodes.length > 0) {
    throw new AppError(409, `These product codes already exist: ${existingCodes.map((r) => r.productCode).join(', ')}`);
  }

  const subGroupNames = [...new Set(parsedRows.map((r) => r.subGroupName.toLowerCase()))];
  const categories = await executeQuery(
    `SELECT id, name FROM categories WHERE LOWER(name) IN (${subGroupNames.map(() => '?').join(',')})`,
    subGroupNames,
  );
  const categoryLookup = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // SubGroupNames with no matching category are auto-created (first spelling in the file
  // wins for display casing) under the GENERAL division inside the same transaction.
  const missingCategories = new Map();
  for (const row of parsedRows) {
    const key = row.subGroupName.toLowerCase();
    if (!categoryLookup.has(key) && !missingCategories.has(key)) {
      missingCategories.set(key, row.subGroupName);
    }
  }

  await withTransaction(async (execute) => {
    if (missingCategories.size > 0) {
      const [division] = await execute(
        `SELECT id FROM divisions WHERE LOWER(name) = ? LIMIT 1`,
        [DEFAULT_IMPORT_DIVISION.toLowerCase()],
      );
      let divisionId = division?.id;
      if (!divisionId) {
        divisionId = crypto.randomUUID();
        await execute(`INSERT INTO divisions (id, name, is_active) VALUES (?, ?, TRUE)`, [divisionId, DEFAULT_IMPORT_DIVISION]);
      }
      for (const [key, name] of missingCategories) {
        const categoryId = crypto.randomUUID();
        await execute(`INSERT INTO categories (id, division_id, name, is_active) VALUES (?, ?, ?, TRUE)`, [categoryId, divisionId, name]);
        categoryLookup.set(key, categoryId);
      }
    }
    for (const row of parsedRows) {
      await execute(
        `INSERT INTO products (id, product_code, category_id, name, mrp, wsp, quantity_available, reorder_level, unit, is_active)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, 'pc', TRUE)`,
        [crypto.randomUUID(), row.productCode, categoryLookup.get(row.subGroupName.toLowerCase()), row.productName],
      );
    }
  });

  return { imported: parsedRows.length, createdCategories: [...missingCategories.values()] };
}
