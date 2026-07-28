import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listUsersApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.USERS.LIST, { params })
  return toListResult(res)
}

export async function getUserApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(id))
  return data
}

export async function createUserApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.USERS.LIST, input)
  return data
}

export async function updateUserApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.USERS.BY_ID(id), input)
  return data
}

export async function deleteUserApi(id) {
  await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(id))
}

/**
 * A specific customer's order history, for the UserView "Orders"/"Payments" tabs. Hits the same
 * `/orders` endpoint as `features/orders`, filtered to one user — kept here rather than imported
 * from that feature since a feature must never import from another feature's folder (CLAUDE.md).
 */
export async function listUserOrdersApi(userId, params) {
  const res = await apiClient.get(API_ENDPOINTS.ORDERS.LIST, { params: { ...params, customer_id: userId } })
  return toListResult(res)
}
