import { useQuery } from "@tanstack/react-query"
import {
  getOrderHistoryApi,
  getStaffCountApi,
  getStockMovementApi,
  getStockSummaryApi,
} from "@/features/dashboard/dashboard.api"

export const DASHBOARD_QUERY_KEY = "dashboard"

export function useStockSummary() {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, "stockSummary"],
    queryFn: getStockSummaryApi,
  })
}

export function useOrderHistory(days = 14) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, "orderHistory", days],
    queryFn: () => getOrderHistoryApi({ days }),
  })
}

export function useStockMovement(days = 14) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, "stockMovement", days],
    queryFn: () => getStockMovementApi({ days }),
  })
}

export function useStaffCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, "staffCount"],
    queryFn: getStaffCountApi,
    enabled,
  })
}
