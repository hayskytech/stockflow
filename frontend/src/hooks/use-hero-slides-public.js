import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Public, unauthenticated active hero slides for the storefront homepage. Lives outside any
 * single feature folder since it's read by `features/home` while managed by `features/heroSlides`
 * (a feature must never import from another feature's folder — see warehouse's public info hook
 * for the same pattern).
 */
export const HERO_SLIDES_PUBLIC_QUERY_KEY = "heroSlidesPublic"

export function useHeroSlidesPublic() {
  return useQuery({
    queryKey: [HERO_SLIDES_PUBLIC_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.HERO_SLIDES.PUBLIC)
      return data
    },
  })
}
