import { useQuery } from "@tanstack/react-query"
import { getStorefrontDivisionApi } from "@/features/division-detail/division-detail.api"

export const DIVISION_DETAIL_QUERY_KEY = "storefrontDivisionDetail"

export function useDivisionDetail(id) {
  return useQuery({
    queryKey: [DIVISION_DETAIL_QUERY_KEY, id],
    queryFn: () => getStorefrontDivisionApi(id),
    enabled: Boolean(id),
  })
}
