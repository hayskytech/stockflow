import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { StoreTopbar } from "@/components/layout/StoreTopbar"
import { StoreNavMenu } from "@/components/layout/StoreNavMenu"
import { useAuthStore } from "@/store/auth.store"
import { useCartStore } from "@/store/cart.store"
import { useNoticePublic } from "@/hooks/use-notice-public"
import { ROLES } from "@/constants/app"

/** Storefront layout — top navbar only, no admin sidebar. Used by customers, and by admin/staff
 *  visiting the storefront through their "View Store" link (see Topbar.jsx). */
export function StoreShell() {
  const userId = useAuthStore((s) => s.user?.id)
  const role = useAuthStore((s) => s.user?.role)
  const syncOwner = useCartStore((s) => s.syncOwner)
  const { data: notice } = useNoticePublic()

  // Plain component state (not persisted) — dismissal only needs to survive in-app navigation,
  // since StoreShell stays mounted across /store/* routes and resets naturally on a full reload.
  const [staffBannerDismissed, setStaffBannerDismissed] = useState(false)

  // Clears any cart left behind by a different account on this browser (e.g. a shared
  // back-office terminal an admin and a customer both use) before this session touches it.
  useEffect(() => {
    syncOwner(userId)
  }, [userId, syncOwner])

  return (
    <div className="storefront min-vh-100 bg-light">
      <div className="sticky-top">
        <StoreTopbar />
        <StoreNavMenu />
      </div>
      {notice?.message ? (
        <div id="store-notice-bar" className="store-notice-bar">
          <div className="store-notice-bar-track">
            <span>{notice.message}</span>
            <span aria-hidden="true">{notice.message}</span>
          </div>
        </div>
      ) : null}
      {role !== ROLES.CUSTOMER && !staffBannerDismissed ? (
        <div
          id="store-staff-banner"
          className="alert alert-warning alert-dismissible text-center mb-0 py-2 rounded-0"
        >
          You&rsquo;re viewing the storefront as {role}. Orders placed here go through the real order flow and
          require a real bank transfer, just like a customer order.
          <button
            type="button"
            id="store-staff-banner-dismiss"
            className="close"
            aria-label="Dismiss"
            onClick={() => setStaffBannerDismissed(true)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      ) : null}
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  )
}
