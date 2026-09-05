import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Platform super-admin API for the `businesses` directory. Every path hits `/businesses...`
 * flat — these are NOT tenant-scoped, so the axios interceptor leaves them alone.
 * Backend guard: `authenticate` + `requireSuperAdmin`.
 */

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

/** GET /businesses — paginated. Rows: `{ id, name, slug, is_active, memberCount, created_at, updated_at }`. */
export async function listBusinessesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.BUSINESSES.LIST, { params })
  return toListResult(res)
}

/** GET /businesses/:id */
export async function getBusinessApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.BUSINESSES.BY_ID(id))
  return data
}

/** POST /businesses — `{ name, slug?, initialAdminEmail?, initialAdminName?, initialAdminPassword? }`. */
export async function createBusinessApi(body) {
  const { data } = await apiClient.post(API_ENDPOINTS.BUSINESSES.LIST, body)
  return data
}

/** PUT /businesses/:id — `{ name?, slug?, isActive? }`. */
export async function updateBusinessApi(id, body) {
  const { data } = await apiClient.put(API_ENDPOINTS.BUSINESSES.BY_ID(id), body)
  return data
}

/** DELETE /businesses/:id — deactivates the business (204). */
export async function deactivateBusinessApi(id) {
  await apiClient.delete(API_ENDPOINTS.BUSINESSES.BY_ID(id))
}

/** GET /businesses/:id/members — paginated. Rows: `{ userId, name, email, phone, role, memberSince }`. */
export async function listBusinessMembersApi(id, params) {
  const res = await apiClient.get(API_ENDPOINTS.BUSINESSES.MEMBERS(id), { params })
  return toListResult(res)
}
