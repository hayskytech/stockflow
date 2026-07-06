import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listStockLedgerApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.STOCK_LEDGER, { params })
  return toListResult(res)
}
