import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { useCartStore } from "@/store/cart.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { StoreSearchBox } from "@/components/layout/StoreSearchBox"
import { ROLES } from "@/constants/app"
import { ROUTES } from "@/constants/routes"

/** Ecommerce top navigation for the customer storefront — brand, search, cart, account menu. */
export function StoreTopbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))
  const siteTitle = useSiteTitle()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      navigate(ROUTES.AUTH.LOGIN, { replace: true })
    }
  }

  return (
    <nav className="navbar navbar-expand navbar-dark bg-primary">
      <div className="container flex-wrap">
        <Link to={ROUTES.STORE.HOME} className="navbar-brand font-weight-bold mr-2">
          {siteTitle}
        </Link>

        {/* Inline search — desktop only; on mobile it drops to its own full-width row below. */}
        <div className="d-none d-md-block flex-grow-1 mx-3" style={{ maxWidth: "480px" }}>
          <StoreSearchBox id="store-search" />
        </div>

        <ul className="navbar-nav flex-row align-items-center ml-auto">
          <li className="nav-item">
            <Link id="store-cart-link" to={ROUTES.STORE.CART} className="nav-link position-relative mr-2">
              <i className="fas fa-shopping-cart" />
              {cartCount > 0 ? (
                <span
                  className="badge badge-danger"
                  style={{ position: "absolute", top: 0, right: 0, fontSize: "0.65rem" }}
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </li>
          <li
            className={`nav-item dropdown ${menuOpen ? "show" : ""}`}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="nav-link btn btn-link text-white"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <i className="far fa-user mr-md-1" />
              <span className="d-none d-md-inline">{user?.name ?? "Account"}</span>
              <i className="fas fa-caret-down ml-1" />
            </button>
            <div className={`dropdown-menu dropdown-menu-right ${menuOpen ? "show" : ""}`}>
              {user ? (
                <>
                  {user.role === ROLES.ADMIN || user.role === ROLES.STAFF ? (
                    <Link id="store-dashboard-link" to={ROUTES.DASHBOARD} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      <i className="fas fa-gauge mr-2" />
                      Dashboard
                    </Link>
                  ) : null}
                  <Link id="store-my-orders-link" to={ROUTES.STORE.ORDERS} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <i className="fas fa-receipt mr-2" />
                    My Orders
                  </Link>
                  <button type="button" className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link id="store-login-link" to={ROUTES.AUTH.LOGIN} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <i className="fas fa-sign-in-alt mr-2" />
                    Login
                  </Link>
                  <Link id="store-register-link" to={ROUTES.AUTH.REGISTER} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <i className="fas fa-user-plus mr-2" />
                    Register
                  </Link>
                </>
              )}
            </div>
          </li>
        </ul>

        {/* Full-width search row — mobile only. */}
        <div className="d-md-none w-100 mt-2">
          <StoreSearchBox id="store-search-mobile" />
        </div>
      </div>
    </nav>
  )
}
