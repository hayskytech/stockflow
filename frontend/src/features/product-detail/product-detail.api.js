import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getStorefrontProductApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id))
  return data
}
