import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/** Authenticates with email + password, returns user profile and a short-lived access token */
export async function loginApi(credentials) {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
  return data
}

/**
 * Exchanges the HttpOnly refresh cookie for a new access token + user profile.
 * Called on app load to silently restore a session without requiring re-login.
 */
export async function refreshApi() {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH)
  return data
}

/** Invalidates the server-side refresh token and clears the HttpOnly cookie */
export async function logoutApi() {
  await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
}

/** Changes the authenticated user's password. Requires a valid access token. */
export async function changePasswordApi(input) {
  await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, input)
}
