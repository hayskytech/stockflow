import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Public site branding (logo + favicon) — unauthenticated. Lives outside any single feature
 * folder since the storefront header (logo) and the browser tab (favicon, set app-wide in
 * App.jsx) both need it; the Settings feature itself owns the full read/write hooks for the
 * admin form.
 */
export const SITE_BRANDING_PUBLIC_QUERY_KEY = "siteBrandingPublic"

export function useSiteBrandingPublic() {
  return useQuery({
    queryKey: [SITE_BRANDING_PUBLIC_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SETTINGS.BRANDING_PUBLIC)
      return data
    },
  })
}
