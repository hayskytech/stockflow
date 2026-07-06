import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES } from "@/constants/routes"

export function Topbar({ onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  // Clicking anywhere outside the dropdown closes it (mirrors Bootstrap's own behavior).
  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [menuOpen])

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
        <li className="nav-item">
          <a
            id="view-store-link"
            href={`/#${ROUTES.STORE.HOME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <i className="fas fa-store mr-1" />
            View Store
          </a>
        </li>
        <li ref={menuRef} className={`nav-item dropdown ${menuOpen ? "show" : ""}`}>
          <button
            type="button"
            className="nav-link btn btn-link"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="far fa-user mr-1" />
            {user?.name ?? "Account"}
          </button>
          <div className={`dropdown-menu dropdown-menu-lg dropdown-menu-right ${menuOpen ? "show" : ""}`}>
            {user?.role === "admin" ? (
              <>
                <button
                  type="button"
                  id="topbar-warehouse-link"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate(ROUTES.WAREHOUSE)
                  }}
                >
                  <i className="fas fa-warehouse mr-2" />
                  Warehouse
                </button>
                <button
                  type="button"
                  id="topbar-settings-link"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate(ROUTES.SETTINGS)
                  }}
                >
                  <i className="fas fa-cog mr-2" />
                  Settings
                </button>
                <div className="dropdown-divider" />
              </>
            ) : null}
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
