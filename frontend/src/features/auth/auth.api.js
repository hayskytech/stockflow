import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Authenticates with a password against an email (admin/staff) or a phone number (customers),
 * returning the user profile and a short-lived access token.
 */
export async function loginApi(credentials) {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
  return data
}

/**
 * Asks the server to text a verification code to a phone number.
 * Resolves the same way whether or not a code was actually sent — the response deliberately
 * carries no hint about whether the number has an account.
 */
export async function sendOtpApi({ phone, purpose }) {
  await apiClient.post(API_ENDPOINTS.AUTH.OTP_SEND, { phone, purpose })
}

/** Exchanges a phone number + the code just received for a session. */
export async function otpLoginApi({ phone, otp }) {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.OTP_LOGIN, { phone, otp })
  return data
}

/** Registers a new customer account and auto-logs in, returning user profile + access token */
export async function registerApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, input)
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

/**
 * Fills in the profile of an account that OTP login created from a bare phone number.
 * Returns the refreshed profile, so the caller can replace its incomplete copy of the user.
 */
export async function completeProfileApi(input) {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.COMPLETE_PROFILE, input)
  return data
}

/** Changes the authenticated user's password. Requires a valid access token. */
export async function changePasswordApi(input) {
  await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, input)
}

/** Lists the authenticated user's own active login sessions (device/IP/last-used). */
export async function listMySessionsApi() {
  const { data } = await apiClient.get(API_ENDPOINTS.AUTH.MY_SESSIONS)
  return data
}

/** Revokes one of the authenticated user's own sessions. */
export async function revokeMySessionApi(sessionId) {
  await apiClient.delete(API_ENDPOINTS.AUTH.MY_SESSION_BY_ID(sessionId))
}
