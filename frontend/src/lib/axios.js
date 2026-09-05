import axios from "axios"
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api"
import { ROUTES } from "@/constants/routes"
import { useAuthStore } from "@/store/auth.store"
import { useBusinessStore } from "@/store/business.store"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send HttpOnly refresh cookie on every request
})

/**
 * Tenant-scoped API path prefixes. A request to one of these is rewritten to
 * `/b/:businessId<path>` using the current business from `useBusinessStore`, so individual
 * `.api.js` functions never have to pass a `businessId`. Everything else (`/auth`, `/businesses`,
 * `/users`, `/admin`, and the still-public `.../public` storefront reads) is left flat.
 */
const TENANT_PREFIXES = [
  "/products",
  "/stock",
  "/stock-ledger",
  "/orders",
  "/dispatches",
  "/reports",
  "/categories",
  "/sub-categories",
  "/sizes",
  "/media",
  "/hero-slides",
  "/notice",
  "/business-settings",
  "/settings/social",
  "/settings/branding",
  "/settings/delete-all-data",
]

/** Still-flat public reads — matched BEFORE the generic `/notice` / `/settings/...` prefixes. */
const TENANT_PUBLIC_PATHS = new Set([
  "/notice/public",
  "/hero-slides/public",
  "/settings/social/public",
  "/settings/branding/public",
])

function needsTenantScope(url) {
  const path = url.split("?")[0]
  if (TENANT_PUBLIC_PATHS.has(path)) return false
  return TENANT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

/** Attaches the access token and rewrites tenant-scoped paths to `/b/:businessId/...`. */
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const url = config.url ?? ""
  if (!url.startsWith("/b/") && needsTenantScope(url)) {
    const businessId = useBusinessStore.getState().currentBusinessId
    if (!businessId) {
      throw new Error(`Tenant-scoped request "${url}" made with no business selected`)
    }
    config.url = `/b/${businessId}${url}`
  }

  return config
})

/**
 * Single in-flight refresh lock — prevents concurrent 401s from each
 * triggering a separate refresh call, which would invalidate each other.
 */
let refreshPromise = null

/**
 * On a 401, silently exchanges the HttpOnly refresh cookie for a new access
 * token and retries the original request once. The refresh endpoint is excluded
 * to prevent an infinite retry loop when the refresh token is expired, and the
 * login endpoint is excluded so invalid credentials surface as a normal form
 * error instead of triggering a refresh attempt and a hard redirect.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isRefreshEndpoint = original.url === API_ENDPOINTS.AUTH.REFRESH
    const isLoginEndpoint = original.url === API_ENDPOINTS.AUTH.LOGIN

    if (error.response?.status === 401 && !original._retry && !isRefreshEndpoint && !isLoginEndpoint) {
      original._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {}, { withCredentials: true })
            .then(({ data }) => {
              useAuthStore.getState().setAuth(data.user, data.accessToken)
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        await refreshPromise

        const newToken = useAuthStore.getState().accessToken ?? ""
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = `/#${ROUTES.AUTH.LOGIN}`
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)
