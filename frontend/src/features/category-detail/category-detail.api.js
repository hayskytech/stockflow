import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getStorefrontCategoryApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.CATEGORIES.BY_ID(id))
  return data
}

/** Paginated active products in a category, for the Category page's product grid. Unlike the
 *  storefront Home page (which loads a flat unpaginated list), this page needs the total/totalPages
 *  headers to page through a whole category, so it reads them the same way the admin Products
 *  feature does rather than returning the bare array. */
export async function listCategoryProductsApi(categoryId, params) {
  const { data, headers } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { ...params, category_id: categoryId, is_active: true },
  })
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}
