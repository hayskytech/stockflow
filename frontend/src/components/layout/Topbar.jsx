import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

export function Topbar({ onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const siteTitle = useSiteTitle()

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
        <li className="nav-item d-md-none">
          <Link id="topbar-site-title-link" to={ROUTES.DASHBOARD} className="nav-link font-weight-bold">
            {siteTitle}
          </Link>
        </li>
      </ul>

      <ul className="navbar-nav ml-auto">
        <li ref={menuRef} className={`nav-item dropdown ${menuOpen ? "show" : ""}`}>
          <button
            type="button"
            className="nav-link btn btn-link"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="far fa-user mr-md-1" />
            <span className="d-none d-md-inline">{user?.name ?? "Account"}</span>
          </button>
          <div className={`dropdown-menu dropdown-menu-lg dropdown-menu-right ${menuOpen ? "show" : ""}`}>
            <button
              type="button"
              id="topbar-profile-link"
              className="dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                navigate(ROUTES.PROFILE)
              }}
            >
              <i className="far fa-user mr-2" />
              My Profile
            </button>
            <div className="dropdown-divider" />
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
