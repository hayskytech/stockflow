import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

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

export async function deleteStockApi(id) {
  await apiClient.delete(API_ENDPOINTS.STOCK.BY_ID(id))
}

/** Bulk-creates scanned stock units — { productId, invoiceNo, ..., barcodes: [] }. */
export async function createStockApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.STOCK.CREATE, payload)
  return data
}

/** Returns the subset of `barcodes` that already exist in stock (with product/status). */
export async function checkBarcodesApi(barcodes) {
  const { data } = await apiClient.post(API_ENDPOINTS.STOCK.BARCODE_STATUS, { barcodes })
  return data.existing
}
