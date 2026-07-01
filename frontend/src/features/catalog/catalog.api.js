import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

// --- Divisions ---------------------------------------------------------

export async function listDivisionsApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.DIVISIONS.LIST, { params })
  return toListResult(res)
}

export async function createDivisionApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.DIVISIONS.LIST, input)
  return data
}

export async function updateDivisionApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.DIVISIONS.BY_ID(id), input)
  return data
}

export async function deleteDivisionApi(id) {
  await apiClient.delete(API_ENDPOINTS.DIVISIONS.BY_ID(id))
}

// --- Categories ----------------------------------------------------------

export async function listCategoriesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST, { params })
  return toListResult(res)
}

export async function createCategoryApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.CATEGORIES.LIST, input)
  return data
}

export async function updateCategoryApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.CATEGORIES.BY_ID(id), input)
  return data
}

export async function deleteCategoryApi(id) {
  await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id))
}

// --- Sub-categories --------------------------------------------------------

export async function listSubCategoriesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.SUB_CATEGORIES.LIST, { params })
  return toListResult(res)
}

export async function createSubCategoryApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.SUB_CATEGORIES.LIST, input)
  return data
}

export async function updateSubCategoryApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.SUB_CATEGORIES.BY_ID(id), input)
  return data
}

export async function deleteSubCategoryApi(id) {
  await apiClient.delete(API_ENDPOINTS.SUB_CATEGORIES.BY_ID(id))
}
