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
