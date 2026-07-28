import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES, landingPathForRole } from "@/constants/routes"

/**
 * Blocks access to authenticated routes while the initial silent refresh is in
 * flight, then redirects to login if no valid session exists after it completes.
 *
 * Pass `allow` (array of roles) to also restrict the branch to those roles — a
 * user whose role is not allowed is redirected to their own landing area
 * (e.g. a customer hitting an admin route lands on the storefront, and vice-versa).
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
    return <Navigate to={landingPathForRole(role)} replace />
  }

  return children
}
