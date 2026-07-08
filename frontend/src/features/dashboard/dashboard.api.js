import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getStockSummaryApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.STOCK_SUMMARY)
  return data
}

export async function getOrderHistoryApi(params) {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.ORDER_HISTORY, { params })
  return data
}

export async function getStockMovementApi(params) {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.STOCK_MOVEMENT, { params })
  return data
}

/** Count-only lookup (no user rows fetched) — reads the total from the pagination header. */
export async function getStaffCountApi() {
  const res = await apiClient.get(API_ENDPOINTS.USERS.LIST, { params: { per_page: 1 } })
  return Number(res.headers["x-wp-total"] ?? 0)
}
