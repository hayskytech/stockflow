import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { StoreTopbar } from "@/components/layout/StoreTopbar"
import { useAuthStore } from "@/store/auth.store"
import { useCartStore } from "@/store/cart.store"
import { ROLES } from "@/constants/app"

/** Storefront layout — top navbar only, no admin sidebar. Used by customers, and by admin/staff
 *  visiting the storefront through their "View Store" link (see Topbar.jsx). */
export function StoreShell() {
  const userId = useAuthStore((s) => s.user?.id)
  const role = useAuthStore((s) => s.user?.role)
  const syncOwner = useCartStore((s) => s.syncOwner)

  // Clears any cart left behind by a different account on this browser (e.g. a shared
  // back-office terminal an admin and a customer both use) before this session touches it.
  useEffect(() => {
    syncOwner(userId)
  }, [userId, syncOwner])

  return (
    <div className="storefront min-vh-100 bg-light">
      <StoreTopbar />
      {role !== ROLES.CUSTOMER ? (
        <div id="store-staff-banner" className="alert alert-warning text-center mb-0 py-2 rounded-0">
          You&rsquo;re viewing the storefront as {role}. Orders placed here reserve real stock and require a real
          bank transfer, just like a customer order.
        </div>
      ) : null}
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  )
}
