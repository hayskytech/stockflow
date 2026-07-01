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
