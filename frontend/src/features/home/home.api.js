import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Fetches products for the storefront home page. The products list endpoint
 * returns the plain array of items (pagination metadata lives in headers, which
 * the storefront does not need), so we return the data array directly.
 */
export async function listStorefrontProductsApi(params) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, { params })
  return data
}

const CATEGORY_CAROUSEL_COUNT = 12

/** First 12 active products in a category, for that category's carousel section on the Home page. */
export async function listCategoryCarouselProductsApi(categoryId) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { category_id: categoryId, is_active: true, per_page: CATEGORY_CAROUSEL_COUNT, orderby: "name", order: "asc" },
  })
  return data
}
