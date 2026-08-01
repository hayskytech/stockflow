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

export async function listStockApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.STOCK.LIST, { params })
  return toListResult(res)
}

export async function getStockApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.STOCK.BY_ID(id))
  return data
}

export async function importStockApi(file) {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await apiClient.post(API_ENDPOINTS.STOCK.IMPORT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function downloadStockImportTemplateApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.STOCK.IMPORT_TEMPLATE, { responseType: "blob" })
  downloadBlob(data, "stock-import-template.xlsx")
}

export async function deleteStockApi(id) {
  await apiClient.delete(API_ENDPOINTS.STOCK.BY_ID(id))
}

/** Creates one stock intake batch — { productId, quantity, invoiceNo, ... }. */
export async function createStockBatchApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.STOCK.CREATE, payload)
  return data
}
