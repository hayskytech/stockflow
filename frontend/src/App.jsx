import { useEffect, useRef } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/router"
import { refreshApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { useSiteBrandingPublic } from "@/hooks/use-site-branding-public"
import { resolveMediaUrl } from "@/lib/media"

/**
 * On mount, attempts a silent token refresh using the HttpOnly cookie left from
 * a previous session. Sets isInitialized once complete (success or failure) so
 * ProtectedRoute and LoginPage know whether to render or show a loader.
 *
 * The ref guard prevents React StrictMode's double-invoke from firing two
 * simultaneous refresh calls, which would cause the second to hit reuse
 * detection and wipe all sessions.
 */
export function App() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setInitialized = useAuthStore((s) => s.setInitialized)
  const refreshed = useRef(false)
  const siteTitle = useSiteTitle()
  const { data: branding } = useSiteBrandingPublic()

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

  useEffect(() => {
    document.title = siteTitle
  }, [siteTitle])

  useEffect(() => {
    // index.html ships no <link rel="icon"> of its own, so this creates one the first
    // time a favicon is set. If an admin later clears the favicon in the same tab
    // session, remove the injected tag again rather than leaving the stale icon in
    // place until a full reload — there's no static default to fall back to.
    const link = document.querySelector("link[rel='icon']")
    if (!branding?.faviconUrl) {
      link?.remove()
      return
    }
    if (link) {
      link.href = resolveMediaUrl(branding.faviconUrl)
    } else {
      const newLink = document.createElement("link")
      newLink.rel = "icon"
      newLink.href = resolveMediaUrl(branding.faviconUrl)
      document.head.appendChild(newLink)
    }
  }, [branding?.faviconUrl])

  return <RouterProvider router={router} />
}
