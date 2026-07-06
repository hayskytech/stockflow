import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/** Dev-only: wipes all transactional data (products, orders, stock, media, non-seed users). */
export async function deleteAllDataApi() {
  const { data } = await apiClient.post(API_ENDPOINTS.SETTINGS.DELETE_ALL_DATA, { confirm: "DELETE" })
  return data
}
