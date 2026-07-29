import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listHeroSlidesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.HERO_SLIDES.LIST, { params })
  return toListResult(res)
}

export async function createHeroSlideApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.HERO_SLIDES.LIST, input)
  return data
}

export async function updateHeroSlideApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.HERO_SLIDES.BY_ID(id), input)
  return data
}

export async function deleteHeroSlideApi(id) {
  await apiClient.delete(API_ENDPOINTS.HERO_SLIDES.BY_ID(id))
}

export async function reorderHeroSlidesApi(orderedIds) {
  await apiClient.patch(API_ENDPOINTS.HERO_SLIDES.REORDER, { orderedIds })
}
