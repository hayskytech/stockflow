import { useQuery } from "@tanstack/react-query"
import { listUserOrdersApi } from "@/features/users/users.api"

export const USER_ORDERS_QUERY_KEY = "userOrders"

export function useUserOrders(userId, params) {
  return useQuery({
    queryKey: [USER_ORDERS_QUERY_KEY, userId, params],
    queryFn: () => listUserOrdersApi(userId, params),
    enabled: Boolean(userId),
  })
}
