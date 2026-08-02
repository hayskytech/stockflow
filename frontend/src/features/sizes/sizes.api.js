import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listSizesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.SIZES.LIST, { params })
  return toListResult(res)
}

export async function createSizeApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.SIZES.LIST, input)
  return data
}

export async function updateSizeApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.SIZES.BY_ID(id), input)
  return data
}

export async function deleteSizeApi(id) {
  await apiClient.delete(API_ENDPOINTS.SIZES.BY_ID(id))
}

export async function reorderSizesApi(orderedIds) {
  await apiClient.patch(API_ENDPOINTS.SIZES.REORDER, { orderedIds })
}
