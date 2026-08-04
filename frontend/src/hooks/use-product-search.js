import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Type-ahead product search backing the storefront header search box (StoreTopbar). Lives
 * outside any single feature since that search box is shared layout, reachable from every
 * storefront page.
 */

export const PRODUCT_SEARCH_QUERY_KEY = "productSearch"

export function useProductSearch(search, limit) {
  return useQuery({
    queryKey: [PRODUCT_SEARCH_QUERY_KEY, search, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
        params: { search, per_page: limit, is_active: true, orderby: "name", order: "asc" },
      })
      return data
    },
    enabled: search.length > 0,
    staleTime: 30 * 1000,
  })
}
