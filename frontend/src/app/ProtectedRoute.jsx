import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES, landingPathForRole } from "@/constants/routes"

/**
 * Blocks access to authenticated routes while the initial silent refresh is in
 * flight, then redirects to login if no valid session exists after it completes.
 *
 * Pass `allow` (array of roles) to also restrict the branch to those roles — a
 * user whose role is not allowed is redirected to their own landing area.
 * The storefront is on hold (see multitenant_plan.md), so the only back-office
 * roles are admin/staff; a leftover `customer` session is signed out rather than
 * bounced (there is nowhere for it to land).
 */
export function ProtectedRoute({ children, allow }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.user?.role)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />
  }

  if (allow && !allow.includes(role)) {
    // Storefront is on hold: a non-admin/staff role has nowhere to land.
    if (role !== "admin" && role !== "staff") {
      return <Navigate to={ROUTES.AUTH.LOGIN} replace />
    }
    return <Navigate to={landingPathForRole(role)} replace />
  }

  return children
}
