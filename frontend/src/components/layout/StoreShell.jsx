import { useEffect } from "react"
import { Link, Outlet } from "react-router-dom"
import { StoreTopbar } from "@/components/layout/StoreTopbar"
import { StoreNavMenu } from "@/components/layout/StoreNavMenu"
import { Footer } from "@/components/layout/Footer"
import { useAuthStore } from "@/store/auth.store"
import { useCartStore } from "@/store/cart.store"
import { ROUTES } from "@/constants/routes"

/** Storefront layout — top navbar only, no admin sidebar. Used by customers, and by admin/staff
 *  visiting the storefront through their "View Store" link (see Topbar.jsx). The Notice Board
 *  bar is NOT rendered here — it only appears on the Home page, below the hero slider, not on
 *  every storefront page (see HomePage.jsx). */
export function StoreShell() {
  const userId = useAuthStore((s) => s.user?.id)
  const profileComplete = useAuthStore((s) => s.user?.profileComplete)
  const syncOwner = useCartStore((s) => s.syncOwner)

  // Clears any cart left behind by a different account on this browser (e.g. a shared
  // back-office terminal an admin and a customer both use) before this session touches it.
  useEffect(() => {
    syncOwner(userId)
  }, [userId, syncOwner])

  return (
    <div className="storefront min-vh-100 d-flex flex-column">
      <div className="sticky-top">
        <StoreTopbar />
        <StoreNavMenu />
      </div>
      <main className="container py-4 flex-grow-1">
        {/* An OTP sign-in can create the account outright, and that form is skippable — so this is
            the standing way back to it. Strictly `false`: undefined means logged out or still
            restoring the session, neither of which owes us a profile. */}
        {profileComplete === false ? (
          <div className="alert alert-warning d-flex align-items-center justify-content-between">
            <span>Your profile is incomplete. Add your name and address to place orders.</span>
            <Link
              id="store-complete-profile-link"
              to={ROUTES.STORE.COMPLETE_PROFILE}
              className="btn btn-sm btn-primary ml-3 flex-shrink-0"
            >
              Complete profile
            </Link>
          </div>
        ) : null}
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
