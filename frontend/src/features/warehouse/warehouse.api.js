import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

export async function getWarehouseApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.WAREHOUSE)
  return data
}

export async function updateWarehouseApi(input) {
  const { data } = await apiClient.put(API_ENDPOINTS.WAREHOUSE, input)
  return data
}
