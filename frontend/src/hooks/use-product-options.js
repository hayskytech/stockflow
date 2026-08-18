import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only product reference data used to populate pickers in other features (e.g. the
 * Stock filter). Lives outside any single feature folder since more than one feature needs
 * it — the Products feature itself owns the full CRUD hooks for managing this data.
 */
export const PRODUCT_OPTIONS_QUERY_KEY = "productOptions"

export function useProductOptions() {
  return useQuery({
    queryKey: [PRODUCT_OPTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, { params: { per_page: 100 } })
      return data
    },
  })
}
