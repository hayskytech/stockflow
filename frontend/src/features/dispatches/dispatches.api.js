import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listDispatchesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.DISPATCHES.LIST, { params })
  return toListResult(res)
}

export async function getDispatchApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.DISPATCHES.BY_ID(id))
  return data
}

/**
 * The order being dispatched (number, status, items with quantities). Fetched here rather
 * than from the orders feature — features never import each other's modules.
 */
export async function getDispatchOrderApi(orderId) {
  const { data } = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(orderId))
  return data
}

/** Dispatch of an accepted order — { orderId, courierName?, awbNumber?, note? }. */
export async function createDispatchApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.DISPATCHES.CREATE, payload)
  return data
}
