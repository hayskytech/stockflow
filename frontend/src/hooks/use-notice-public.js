import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Public notice-board text for the storefront (StoreShell) — unauthenticated, empty when the
 * notice is switched off. Lives outside any single feature folder since StoreShell needs it on
 * every /store/* route; the Notice feature itself owns the full read/write hooks for its own
 * admin settings page.
 */
export const NOTICE_PUBLIC_QUERY_KEY = "noticePublic"

export function useNoticePublic() {
  return useQuery({
    queryKey: [NOTICE_PUBLIC_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.NOTICE_PUBLIC)
      return data
    },
  })
}
