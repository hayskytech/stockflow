import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteAllDataApi,
  getSiteBrandingApi,
  getSocialLinksApi,
  updateSiteBrandingApi,
  updateSocialLinksApi,
} from "@/features/settings/settings.api"
import { SOCIAL_LINKS_PUBLIC_QUERY_KEY } from "@/hooks/use-social-links-public"
import { SITE_BRANDING_PUBLIC_QUERY_KEY } from "@/hooks/use-site-branding-public"

export function useDeleteAllData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAllDataApi,
    // Every cached list/detail in the app is now stale — invalidate everything.
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export const SOCIAL_LINKS_QUERY_KEY = "socialLinks"

export function useSocialLinks() {
  return useQuery({
    queryKey: [SOCIAL_LINKS_QUERY_KEY],
    queryFn: getSocialLinksApi,
  })
}

export function useUpdateSocialLinks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSocialLinksApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SOCIAL_LINKS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [SOCIAL_LINKS_PUBLIC_QUERY_KEY] })
    },
  })
}

export const SITE_BRANDING_QUERY_KEY = "siteBranding"

export function useSiteBranding() {
  return useQuery({
    queryKey: [SITE_BRANDING_QUERY_KEY],
    queryFn: getSiteBrandingApi,
  })
}

export function useUpdateSiteBranding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSiteBrandingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE_BRANDING_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [SITE_BRANDING_PUBLIC_QUERY_KEY] })
    },
  })
}
