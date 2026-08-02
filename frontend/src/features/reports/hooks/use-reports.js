import { useQuery } from "@tanstack/react-query"
import { getMonthlyOrderSummaryApi, getStockMovementApi } from "@/features/reports/reports.api"

export const REPORTS_QUERY_KEY = "reports"

export function useStockMovement(days) {
  return useQuery({
    queryKey: [REPORTS_QUERY_KEY, "stock-movement", days],
    queryFn: () => getStockMovementApi(days),
  })
}

export function useMonthlyOrderSummary(months) {
  return useQuery({
    queryKey: [REPORTS_QUERY_KEY, "monthly-orders", months],
    queryFn: () => getMonthlyOrderSummaryApi(months),
  })
}
