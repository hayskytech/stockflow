import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listMediaApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.MEDIA.LIST, { params })
  return toListResult(res)
}

export async function getMediaApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.MEDIA.BY_ID(id))
  return data
}

export async function deleteMediaApi(id) {
  await apiClient.delete(API_ENDPOINTS.MEDIA.BY_ID(id))
}

export async function attachMediaUsageApi(id, entityType, entityId) {
  await apiClient.post(API_ENDPOINTS.MEDIA.USAGE(id), { entityType, entityId })
}

export async function detachMediaUsageApi(id, entityType, entityId) {
  await apiClient.delete(API_ENDPOINTS.MEDIA.USAGE(id), { data: { entityType, entityId } })
}
