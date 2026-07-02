import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

/**
 * Customer-facing order history — hits the same `/orders` endpoints as the admin
 * `features/orders` feature, but the backend automatically scopes results to the
 * logged-in customer's own orders. Kept as a separate feature (not shared) since a
 * feature must never import from another feature's folder (see CLAUDE.md).
 */
export async function listMyOrdersApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.ORDERS.LIST, { params })
  return toListResult(res)
}

export async function getMyOrderApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id))
  return data
}

export async function cancelMyOrderApi(id) {
  const { data } = await apiClient.patch(API_ENDPOINTS.ORDERS.STATUS(id), { status: "cancelled" })
  return data
}
