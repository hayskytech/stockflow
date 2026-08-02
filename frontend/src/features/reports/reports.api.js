import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/** Daily physical in/out movement plus on-hand unit counts. */
export async function getStockMovementApi(days) {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.STOCK_MOVEMENT, { params: { days } })
  return data
}

/** Monthly totals — orders placed and amount purchased, grouped by calendar month. */
export async function getMonthlyOrderSummaryApi(months) {
  const { data } = await apiClient.get(API_ENDPOINTS.REPORTS.MONTHLY_ORDERS, { params: { months } })
  return data
}
