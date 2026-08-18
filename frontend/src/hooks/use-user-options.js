import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only user reference data for pickers (e.g. choosing the customer a manual order is
 * placed for). Lives outside any single feature folder since more than one feature may need
 * it — the Users feature owns the full CRUD hooks. Admin/staff only (the endpoint enforces it).
 */
export const USER_OPTIONS_QUERY_KEY = "userOptions"

export function useUserOptions() {
  return useQuery({
    queryKey: [USER_OPTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.USERS.LIST, { params: { per_page: 100 } })
      return data
    },
  })
}
