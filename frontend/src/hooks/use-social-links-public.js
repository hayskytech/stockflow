import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Public social media links (Facebook/Instagram/YouTube/WhatsApp Channel) for the storefront
 * footer — unauthenticated. Lives outside any single feature folder since the Footer needs it on
 * every page; the Settings feature itself owns the full read/write hooks for the admin form.
 */
export const SOCIAL_LINKS_PUBLIC_QUERY_KEY = "socialLinksPublic"

export function useSocialLinksPublic() {
  return useQuery({
    queryKey: [SOCIAL_LINKS_PUBLIC_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SETTINGS.SOCIAL_LINKS_PUBLIC)
      return data
    },
  })
}
