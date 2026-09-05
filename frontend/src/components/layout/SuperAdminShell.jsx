import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { logoutApi } from "@/features/auth/auth.api"
import { useAuthStore } from "@/store/auth.store"
import { useBusinessStore } from "@/store/business.store"
import { ScrollToTop } from "@/components/common/ScrollToTop"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"

const DESKTOP_QUERY = "(min-width: 992px)"

const NAV_ITEMS = [
  { to: ROUTES.ADMIN.BUSINESSES, icon: "fa-store", label: "Businesses" },
  { to: ROUTES.ADMIN.USERS, icon: "fa-users", label: "Users" },
  { to: ROUTES.ADMIN.SESSIONS, icon: "fa-desktop", label: "Sessions" },
]

/**
 * AdminLTE shell for the platform (super-admin) area at `/admin/*`. Deliberately NOT the
 * business `AppShell` — there is no business context here, so no business switcher and no
 * per-business nav. Clears `currentBusinessId` on mount so a stale value can never leak a
 * tenant prefix into `@/lib/nav` or the axios interceptor while in this area.
 */
export function SuperAdminShell() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setCurrentBusinessId = useBusinessStore((s) => s.setCurrentBusinessId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setCurrentBusinessId(null)
  }, [setCurrentBusinessId])

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    function handleChange(event) {
      setIsDesktop(event.matches)
      setSidebarOpen(event.matches)
    }
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapse", !sidebarOpen)
    document.body.classList.toggle("sidebar-open", sidebarOpen && !isDesktop)
    return () => document.body.classList.remove("sidebar-collapse", "sidebar-open")
  }, [sidebarOpen, isDesktop])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [menuOpen])

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      queryClient.clear()
      navigate(ROUTES.AUTH.LOGIN, { replace: true })
    }
  }

  return (
    <div className="wrapper">
      <ScrollToTop />

      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <i className="fas fa-bars" />
            </button>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link font-weight-bold">
              {APP_NAME} <span className="text-muted">— Platform admin</span>
            </span>
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
                id="superadmin-my-businesses-link"
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(ROUTES.BUSINESSES)
                }}
              >
                <i className="fas fa-store mr-2" />
                My businesses
              </button>
              <button
                type="button"
                id="superadmin-profile-link"
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
              <button type="button" className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2" />
                Logout
              </button>
            </div>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to={ROUTES.ADMIN.BUSINESSES} className="brand-link">
          <span className="brand-text font-weight-light ml-2">Platform admin</span>
        </Link>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
              {NAV_ITEMS.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                    <i className={`nav-icon fas ${item.icon}`} />
                    <p>{item.label}</p>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <div id="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  )
}
