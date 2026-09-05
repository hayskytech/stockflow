import { useEffect, useRef } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/router"
import { refreshApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME } from "@/constants/app"

/**
 * On mount, attempts a silent token refresh using the HttpOnly cookie left from
 * a previous session. Sets isInitialized once complete (success or failure) so
 * ProtectedRoute and LoginPage know whether to render or show a loader.
 *
 * The ref guard prevents React StrictMode's double-invoke from firing two
 * simultaneous refresh calls, which would cause the second to hit reuse
 * detection and wipe all sessions.
 *
 * Title/favicon are static here: the app root has no business context, and per-business
 * branding is a later phase (see multitenant_plan.md Phase 8).
 */
export function App() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setInitialized = useAuthStore((s) => s.setInitialized)
  const refreshed = useRef(false)

  useEffect(() => {
    document.title = APP_NAME
  }, [])

  useEffect(() => {
    if (refreshed.current) return
    refreshed.current = true

    refreshApi()
      .then(({ user, accessToken }) => {
        setAuth(user, accessToken)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setInitialized()
      })
  }, [setAuth, clearAuth, setInitialized])

  return <RouterProvider router={router} />
}
