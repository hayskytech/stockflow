import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { useHomeStore } from "@/features/home/home.store"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"

/** Ecommerce top navigation for the customer storefront — brand, search, account menu. */
export function StoreTopbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const search = useHomeStore((s) => s.search)
  const setSearch = useHomeStore((s) => s.setSearch)
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
    <nav className="navbar navbar-expand navbar-dark bg-primary sticky-top">
      <div className="container">
        <a href={ROUTES.STORE.HOME} className="navbar-brand font-weight-bold">
          {APP_NAME}
        </a>

        <div className="flex-grow-1 mx-3" style={{ maxWidth: "480px" }}>
          <input
            id="store-search"
            type="search"
            className="form-control"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ul className="navbar-nav ml-auto">
          <li className={`nav-item dropdown ${menuOpen ? "show" : ""}`}>
            <button
              type="button"
              className="nav-link btn btn-link text-white"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <i className="far fa-user mr-1" />
              {user?.name ?? "Account"}
            </button>
            <div className={`dropdown-menu dropdown-menu-right ${menuOpen ? "show" : ""}`}>
              <button type="button" className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2" />
                Logout
              </button>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  )
}
