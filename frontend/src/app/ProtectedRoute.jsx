import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES } from "@/constants/routes"

/**
 * Blocks access to authenticated routes while the initial silent refresh is in
 * flight, then redirects to login if no valid session exists after it completes.
 */
export function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { pathname } = useLocation()

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

  if (mustChangePassword && pathname !== ROUTES.AUTH.CHANGE_PASSWORD) {
    return <Navigate to={ROUTES.AUTH.CHANGE_PASSWORD} replace />
  }

  return children
}
