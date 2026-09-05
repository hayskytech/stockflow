import { useCallback } from "react"
import { useNavigate as useRouterNavigate } from "react-router-dom"
import { useBusinessStore } from "@/store/business.store"
import { GLOBAL_ROUTE_RE } from "@/constants/routes"

function scopeTo(to, businessId) {
  if (typeof to !== "string" || !businessId) return to
  if (!to.startsWith("/") || to.startsWith("/b/") || GLOBAL_ROUTE_RE.test(to)) return to
  return `/b/${businessId}${to}`
}

/**
 * Drop-in replacement for react-router's `useNavigate` that auto-scopes an absolute
 * back-office path to the current `/b/:businessId`. Numeric deltas (`navigate(-1)`) and
 * global routes pass through untouched. Import as `{ useAppNavigate as useNavigate }`
 * so existing call sites need no other change.
 */
export function useAppNavigate() {
  const navigate = useRouterNavigate()
  const businessId = useBusinessStore((s) => s.currentBusinessId)
  return useCallback(
    (to, options) => {
      if (typeof to === "number") return navigate(to)
      return navigate(scopeTo(to, businessId), options)
    },
    [navigate, businessId],
  )
}
