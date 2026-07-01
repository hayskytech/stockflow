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
