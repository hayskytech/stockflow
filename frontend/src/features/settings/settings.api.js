import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/** Dev-only: wipes all transactional data (products, orders, stock, media, non-seed users). */
export async function deleteAllDataApi() {
  const { data } = await apiClient.post(API_ENDPOINTS.SETTINGS.DELETE_ALL_DATA, { confirm: "DELETE" })
  return data
}

export async function getSocialLinksApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.SETTINGS.SOCIAL_LINKS)
  return data
}

export async function updateSocialLinksApi(input) {
  const { data } = await apiClient.put(API_ENDPOINTS.SETTINGS.SOCIAL_LINKS, input)
  return data
}

export async function getSiteBrandingApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.SETTINGS.BRANDING)
  return data
}

export async function updateSiteBrandingApi(input) {
  const { data } = await apiClient.put(API_ENDPOINTS.SETTINGS.BRANDING, input)
  return data
}
