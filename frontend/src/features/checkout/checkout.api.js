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

/**
 * The logged-in customer's own saved profile (name/phone/address from registration), used to
 * prefill the checkout shipping form. Hits the same `/auth/me` endpoint as `features/auth` —
 * kept here rather than imported from that feature since a feature must never import from
 * another feature's folder (CLAUDE.md).
 */
export async function getMyProfileApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.AUTH.ME)
  return data
}
