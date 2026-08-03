import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getStorefrontDivisionApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.DIVISIONS.BY_ID(id))
  return data
}

const CATEGORY_PREVIEW_COUNT = 8

/** First 8 active products in a category, for that category's preview section on the Division page. */
export async function listCategoryPreviewProductsApi(categoryId) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { category_id: categoryId, is_active: true, per_page: CATEGORY_PREVIEW_COUNT, orderby: "name", order: "asc" },
  })
  return data
}
