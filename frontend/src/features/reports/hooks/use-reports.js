import { useQuery } from "@tanstack/react-query"
import { getStockMovementApi } from "@/features/reports/reports.api"

export const REPORTS_QUERY_KEY = "reports"

export function useStockMovement(days) {
  return useQuery({
    queryKey: [REPORTS_QUERY_KEY, "stock-movement", days],
    queryFn: () => getStockMovementApi(days),
  })
}
