import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useMe } from "@/features/auth/hooks/use-me"
import { ROUTES, landingPath } from "@/constants/routes"

/**
 * The `/` route. Sends an unauthenticated visitor to login; an authenticated one to their
 * landing target (their only business's dashboard, or the business picker otherwise).
 */
export function RootRedirect() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { data: me, isLoading } = useMe()

  if (!isInitialized || (accessToken && isLoading)) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (!accessToken) return <Navigate to={ROUTES.AUTH.LOGIN} replace />

  return <Navigate to={landingPath(me)} replace />
}
