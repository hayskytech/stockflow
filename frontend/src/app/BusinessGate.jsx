import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { useMe } from "@/features/auth/hooks/use-me"
import { useBusinessStore } from "@/store/business.store"
import { ROUTES } from "@/constants/routes"

function FullPageSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status" />
    </div>
  )
}

/**
 * Layout for the `/b/:businessId` route branch. Confirms the current user may open this
 * business (an active membership, or any business for a super admin), mirrors the id into
 * `useBusinessStore` for the axios interceptor, and only then renders `<AppShell />` (which
 * renders the child routes via its `<Outlet />`). Children never mount until the store is in
 * sync, so no tenant-scoped request can fire without a business id.
 */
export function BusinessGate() {
  const { businessId } = useParams()
  const { data: me, isLoading, isError } = useMe()
  const currentBusinessId = useBusinessStore((s) => s.currentBusinessId)
  const setCurrentBusinessId = useBusinessStore((s) => s.setCurrentBusinessId)

  useEffect(() => {
    setCurrentBusinessId(businessId ?? null)
  }, [businessId, setCurrentBusinessId])

  if (isLoading) return <FullPageSpinner />

  if (isError) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100">
        <p className="text-muted">Could not load your account. Please sign in again.</p>
        <Navigate to={ROUTES.AUTH.LOGIN} replace />
      </div>
    )
  }

  const isMember = (me?.businesses ?? []).some((b) => b.id === businessId)
  if (!isMember && !me?.isSuperAdmin) {
    return <Navigate to={ROUTES.BUSINESSES} replace />
  }

  // One render frame while the effect above syncs the store with the URL.
  if (currentBusinessId !== businessId) return <FullPageSpinner />

  return <AppShell />
}
