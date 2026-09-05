import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES } from "@/constants/routes"

/**
 * Blocks access to authenticated routes while the initial silent refresh is in
 * flight, then redirects to login if no valid session exists after it completes.
 *
 * Pass `allow` (array of global roles) to also gate the branch. Per-business
 * authorization (is this user a member of THIS business?) is done in
 * `BusinessGate`, not here — this only keeps non-back-office roles out.
 */
export function ProtectedRoute({ children, allow }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.user?.role)
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin)
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

  if (allow && !allow.includes(role) && !isSuperAdmin) {
    // Wrong global role for this branch — send them to the business picker to find one they can open.
    return <Navigate to={ROUTES.BUSINESSES} replace />
  }

  return children
}
