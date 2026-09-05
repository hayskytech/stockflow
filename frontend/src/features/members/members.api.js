import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Per-business member management. Every path is relative — the axios interceptor rewrites
 * `/members...` to `/b/:businessId/members...` from the current business (see `lib/axios.js`).
 * Backend: `authenticate` + `resolveBusiness` + `requireBusinessRole('admin')`.
 */

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

/** GET /members — paginated list: `{ userId, name, email, phone, role, memberSince }` rows. */
export async function listMembersApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.MEMBERS.LIST, { params })
  return toListResult(res)
}

/** POST /members — `{ email, role, name?, password? }`. Password required for a brand-new email. */
export async function addMemberApi(body) {
  const { data } = await apiClient.post(API_ENDPOINTS.MEMBERS.LIST, body)
  return data
}

/** PATCH /members/:userId — `{ role }`. */
export async function updateMemberRoleApi(userId, role) {
  const { data } = await apiClient.patch(API_ENDPOINTS.MEMBERS.BY_ID(userId), { role })
  return data
}

/** DELETE /members/:userId — soft-removes the membership (204). */
export async function removeMemberApi(userId) {
  await apiClient.delete(API_ENDPOINTS.MEMBERS.BY_ID(userId))
}
