import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES } from "@/constants/routes"

export function Topbar({ onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
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
    <nav className="main-header navbar navbar-expand navbar-white navbar-light">
      <ul className="navbar-nav">
        <li className="nav-item">
          <button type="button" className="nav-link btn btn-link" onClick={onToggleSidebar}>
            <i className="fas fa-bars" />
          </button>
        </li>
      </ul>

      <ul className="navbar-nav ml-auto">
        <li className={`nav-item dropdown ${menuOpen ? "show" : ""}`}>
          <button
            type="button"
            className="nav-link btn btn-link"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="far fa-user mr-1" />
            {user?.name ?? "Account"}
          </button>
          <div className={`dropdown-menu dropdown-menu-lg dropdown-menu-right ${menuOpen ? "show" : ""}`}>
            <button type="button" className="dropdown-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-2" />
              Logout
            </button>
          </div>
        </li>
      </ul>
    </nav>
  )
}
