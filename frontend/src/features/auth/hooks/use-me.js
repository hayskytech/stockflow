import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"
import { useAuthStore } from "@/store/auth.store"

export const ME_QUERY_KEY = "me"

/**
 * The authenticated user's full profile from `GET /auth/me`, including `isSuperAdmin` and the
 * `businesses` array (`{ id, name, slug, role }`) that drives the business picker, the
 * `BusinessGate` membership check, and the Topbar business switcher.
 *
 * Only fetched once there is an access token. This query is intentionally NOT cleared on a
 * business switch (Topbar's `queryClient.clear()`), because it is not tenant-scoped — it is
 * refetched fresh on the next mount / staleTime boundary like any other query.
 */
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: [ME_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.AUTH.ME)
      return data
    },
    enabled: Boolean(accessToken),
  })
}
