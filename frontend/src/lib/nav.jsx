import { forwardRef } from "react"
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
} from "react-router-dom"
import { useBusinessStore } from "@/store/business.store"
import { GLOBAL_ROUTE_RE } from "@/constants/routes"

/**
 * Prefixes an absolute back-office path with the current `/b/:businessId` segment.
 * Leaves alone: non-string `to` (route objects), relative paths, already-scoped `/b/...`
 * paths, and global routes (`/login`, `/businesses`, `/admin/*`, `/profile`,
 * `/change-password`). When there is no current business, the path is returned unchanged.
 */
function scopeTo(to, businessId) {
  if (typeof to !== "string" || !businessId) return to
  if (!to.startsWith("/") || to.startsWith("/b/") || GLOBAL_ROUTE_RE.test(to)) return to
  return `/b/${businessId}${to}`
}

/** Drop-in replacement for react-router's `Link` that auto-scopes `to` to the current business. */
export const Link = forwardRef(function Link({ to, ...rest }, ref) {
  const businessId = useBusinessStore((s) => s.currentBusinessId)
  return <RouterLink ref={ref} to={scopeTo(to, businessId)} {...rest} />
})

/** Drop-in replacement for react-router's `NavLink` that auto-scopes `to` to the current business. */
export const NavLink = forwardRef(function NavLink({ to, ...rest }, ref) {
  const businessId = useBusinessStore((s) => s.currentBusinessId)
  return <RouterNavLink ref={ref} to={scopeTo(to, businessId)} {...rest} />
})

/** Drop-in replacement for react-router's `Navigate` that auto-scopes `to` to the current business. */
export function Navigate({ to, ...rest }) {
  const businessId = useBusinessStore((s) => s.currentBusinessId)
  return <RouterNavigate to={scopeTo(to, businessId)} {...rest} />
}
