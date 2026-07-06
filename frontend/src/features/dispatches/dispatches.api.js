import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

export async function listDispatchesApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.DISPATCHES.LIST, { params })
  return toListResult(res)
}

export async function getDispatchApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.DISPATCHES.BY_ID(id))
  return data
}

/**
 * The order being dispatched (number, status, items with quantities). Fetched here rather
 * than from the orders feature — features never import each other's modules.
 */
export async function getDispatchOrderApi(orderId) {
  const { data } = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(orderId))
  return data
}

/** Scan-verified dispatch — { orderId, barcodes: [], courierName?, awbNumber?, note? }. */
export async function createDispatchApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.DISPATCHES.CREATE, payload)
  return data
}

/** Per-barcode advisory check against an order: matched / swap / wrong_product / unavailable / unknown. */
export async function checkDispatchBarcodesApi(orderId, barcodes) {
  const { data } = await apiClient.post(API_ENDPOINTS.DISPATCHES.BARCODE_STATUS, { orderId, barcodes })
  return data.results
}

/** Dispatch from an uploaded barcode file (.xlsx/.csv with a Barcode column). */
export async function importDispatchApi({ orderId, file, courierName, awbNumber, note }) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("orderId", orderId)
  if (courierName) formData.append("courierName", courierName)
  if (awbNumber) formData.append("awbNumber", awbNumber)
  if (note) formData.append("note", note)
  const { data } = await apiClient.post(API_ENDPOINTS.DISPATCHES.IMPORT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}
