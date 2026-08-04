import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

const CATEGORY_CAROUSEL_COUNT = 12

/** First 12 active products in a category, for that category's carousel section on the Home page. */
export async function listCategoryCarouselProductsApi(categoryId) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { category_id: categoryId, is_active: true, per_page: CATEGORY_CAROUSEL_COUNT, orderby: "name", order: "asc" },
  })
  return data
}
