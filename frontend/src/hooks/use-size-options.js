import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only predefined size list used to populate the size dropdown on the Product and Stock
 * forms. Lives outside any single feature folder since more than one feature needs it — the
 * Sizes feature itself owns the full CRUD hooks for managing this list on its own page.
 */
export const SIZE_OPTIONS_QUERY_KEY = "sizeOptions"

export function useSizeOptions() {
  return useQuery({
    queryKey: [SIZE_OPTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SIZES.LIST, { params: { per_page: 100, order: "asc" } })
      return data
    },
  })
}
