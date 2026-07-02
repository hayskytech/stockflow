import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cancelMyOrderApi, getMyOrderApi, listMyOrdersApi } from "@/features/my-orders/my-orders.api"

export const MY_ORDERS_QUERY_KEY = "myOrders"

export function useMyOrders(params) {
  return useQuery({
    queryKey: [MY_ORDERS_QUERY_KEY, params],
    queryFn: () => listMyOrdersApi(params),
  })
}

export function useMyOrder(id) {
  return useQuery({
    queryKey: [MY_ORDERS_QUERY_KEY, id],
    queryFn: () => getMyOrderApi(id),
    enabled: Boolean(id),
  })
}

export function useCancelMyOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelMyOrderApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_ORDERS_QUERY_KEY] }),
  })
}
