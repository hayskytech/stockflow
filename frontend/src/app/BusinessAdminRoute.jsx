import { useParams } from "react-router-dom"
import { Navigate } from "@/lib/nav"
import { ROUTES } from "@/constants/routes"
import { useMe } from "@/features/auth/hooks/use-me"

/**
 * Gates a route to admins of the CURRENT business (or a platform super admin).
 * Unlike `ProtectedRoute allow={[ROLES.ADMIN]}`, which checks the global
 * `users.role`, this reads the caller's role in this specific business from
 * `useMe().businesses`. A staff member of the business is redirected to its
 * dashboard. Must render inside the `/b/:businessId` tree (BusinessGate has
 * already confirmed membership by the time this runs).
 */
export function BusinessAdminRoute({ children }) {
  const { businessId } = useParams()
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  const membership = me?.businesses?.find((b) => b.id === businessId)
  const isAdmin = me?.isSuperAdmin || membership?.role === "admin"

  if (!isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
