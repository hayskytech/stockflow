import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useMe } from "@/features/auth/hooks/use-me"
import { ROUTES } from "@/constants/routes"

/**
 * Gates the platform `/admin/*` area to super admins. Unlike `BusinessAdminRoute` (which
 * checks a role within one business), this reads the orthogonal `isSuperAdmin` flag.
 *
 * Compose inside `ProtectedRoute` (which handles the missing-token → /login case and the
 * initial silent-refresh spinner); this only adds the super-admin check. While `GET /auth/me`
 * is still loading, a spinner is shown; a non-super-admin is redirected to the business picker.
 */
export function SuperAdminRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: me, isLoading } = useMe()

  if (!accessToken) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (!me?.isSuperAdmin) {
    return <Navigate to={ROUTES.BUSINESSES} replace />
  }

  return children
}
