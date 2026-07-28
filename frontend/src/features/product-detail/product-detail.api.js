import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getStorefrontProductApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id))
  return data
}

/** Active products in the same category, for the "Related Products" section below a product. */
export async function listRelatedProductsApi(categoryId) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { category_id: categoryId, is_active: true, per_page: 5 },
  })
  return data
}
