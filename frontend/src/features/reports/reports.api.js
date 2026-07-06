import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/** Daily physical in/out movement plus on-hand unit counts. */
export async function getStockMovementApi(days) {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.STOCK_MOVEMENT, { params: { days } })
  return data
}
