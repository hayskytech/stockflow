import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"
import { downloadBlob } from "@/lib/download"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listProductsApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, { params })
  return toListResult(res)
}

export async function getProductApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id))
  return data
}

export async function createProductApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.PRODUCTS.LIST, input)
  return data
}

export async function updateProductApi(id, input) {
  const { data } = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), input)
  return data
}

export async function deleteProductApi(id) {
  await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id))
}

export async function importProductsApi(file) {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await apiClient.post(API_ENDPOINTS.PRODUCTS.IMPORT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function downloadProductImportTemplateApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.IMPORT_TEMPLATE, { responseType: "blob" })
  downloadBlob(data, "product-import-template.xlsx")
}
