import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getNoticeApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.NOTICE)
  return data
}

export async function updateNoticeApi(input) {
  const { data } = await apiClient.put(API_ENDPOINTS.NOTICE, input)
  return data
}
