import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Places an order. `payload.items` must be `{ productId, quantity }` only — price and stock
 * are always re-read from the database server-side, never trusted from the client.
 */
export async function placeOrderApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.ORDERS.LIST, payload)
  return data
}
