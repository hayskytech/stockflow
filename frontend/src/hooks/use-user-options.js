import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only user reference data for pickers (e.g. choosing who a manual order is placed for).
 * Lives outside any single feature folder since more than one feature may need it.
 *
 * TODO(phase-7): this used to hit `/users` (now super-admin-only) and returned customers too.
 * The storefront / customer accounts are on hold, so for now it lists the current business's
 * members (admin + staff) via the per-business members endpoint. Revisit when customers return.
 */
export const USER_OPTIONS_QUERY_KEY = "userOptions"

export function useUserOptions() {
  return useQuery({
    queryKey: [USER_OPTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.MEMBERS.LIST, { params: { per_page: 100 } })
      return data.map((m) => ({
        id: m.userId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: m.role,
        isActive: true,
      }))
    },
  })
}
