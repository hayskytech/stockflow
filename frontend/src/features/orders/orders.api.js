import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

function toListResult({ data, headers }) {
  return {
    items: data,
    total: Number(headers["x-wp-total"] ?? data.length),
    totalPages: Number(headers["x-wp-totalpages"] ?? 1),
  }
}

/** Admin/staff order management — sees every order (see frontend/src/features/my-orders for the customer side). */
export async function listOrdersApi(params) {
  const res = await apiClient.get(API_ENDPOINTS.ORDERS.LIST, { params })
  return toListResult(res)
}

export async function getOrderApi(id) {
  const { data } = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id))
  return data
}

/** Manual order entered by admin/staff on behalf of a customer (offline or bank transfer). */
export async function createOrderApi(payload) {
  const { data } = await apiClient.post(API_ENDPOINTS.ORDERS.CREATE, payload)
  return data
}

export async function updateOrderStatusApi(id, status) {
  const { data } = await apiClient.patch(API_ENDPOINTS.ORDERS.STATUS(id), { status })
  return data
}

export async function updatePaymentStatusApi(id, paymentStatus) {
  const { data } = await apiClient.patch(API_ENDPOINTS.ORDERS.PAYMENT_STATUS(id), { paymentStatus })
  return data
}
