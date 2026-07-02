import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only warehouse settings (name/address/contact + bank transfer details) used by other
 * features (e.g. Checkout, to show bank details for payment). Lives outside any single feature
 * folder since more than one feature needs it — the Warehouse feature itself owns the full
 * read/write hooks for managing this data on its own settings page.
 */
export const WAREHOUSE_DETAILS_QUERY_KEY = "warehouseDetails"

export function useWarehouseDetails() {
  return useQuery({
    queryKey: [WAREHOUSE_DETAILS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.WAREHOUSE)
      return data
    },
  })
}
