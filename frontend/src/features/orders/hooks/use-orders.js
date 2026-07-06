import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getOrderApi,
  listOrdersApi,
  updateOrderStatusApi,
  updatePaymentStatusApi,
} from "@/features/orders/orders.api"

export const ORDERS_QUERY_KEY = "orders"

// Status changes move stock (reserve/release/dispatch) and write ledger rows — invalidated
// by key string since features never import each other's modules.
const STOCK_QUERY_KEY = "stock"
const STOCK_LEDGER_QUERY_KEY = "stockLedger"
const PRODUCTS_QUERY_KEY = "products"

export function useOrders(params) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, params],
    queryFn: () => listOrdersApi(params),
  })
}

export function useOrder(id) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, id],
    queryFn: () => getOrderApi(id),
    enabled: Boolean(id),
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateOrderStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
    },
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentStatus }) => updatePaymentStatusApi(id, paymentStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] }),
  })
}
