import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@/lib/nav"
import { useAppNavigate as useNavigate } from "@/hooks/use-app-navigate"
import { logoutApi } from "@/features/auth/auth.api"
import { useMe } from "@/features/auth/hooks/use-me"
import { useAuthStore } from "@/store/auth.store"
import { useBusinessStore } from "@/store/business.store"
import { useSiteTitle } from "@/hooks/use-business-settings"
import { ROUTES, businessPath } from "@/constants/routes"

export function Topbar({ onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const menuRef = useRef(null)
  const switcherRef = useRef(null)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const siteTitle = useSiteTitle()
  const { data: me } = useMe()
  const currentBusinessId = useBusinessStore((s) => s.currentBusinessId)

  const businesses = me?.businesses ?? []
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId)
  const currentRole = currentBusiness?.role
  const isBusinessAdmin = currentRole === "admin" || Boolean(me?.isSuperAdmin)

  // Clicking anywhere outside a dropdown closes it (mirrors Bootstrap's own behavior).
  useEffect(() => {
    if (!menuOpen && !switcherOpen) return undefined
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
      if (switcherRef.current && !switcherRef.current.contains(event.target)) setSwitcherOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [menuOpen, switcherOpen])

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      queryClient.clear()
      navigate(ROUTES.AUTH.LOGIN, { replace: true })
    }
  }

  function switchBusiness(businessId) {
    setSwitcherOpen(false)
    if (businessId === currentBusinessId) return
    // Clearing the cache is how we keep per-business data isolated without per-query businessId keys.
    queryClient.clear()
    navigate(businessPath(businessId, ROUTES.DASHBOARD))
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

        <li ref={switcherRef} className={`nav-item dropdown ${switcherOpen ? "show" : ""}`}>
          <button
            type="button"
            id="topbar-business-switcher"
            className="nav-link btn btn-link font-weight-bold"
            onClick={() => setSwitcherOpen((v) => !v)}
          >
            <i className="fas fa-store mr-1 text-muted" />
            {currentBusiness?.name ?? "Select business"}
            <i className="fas fa-caret-down ml-1" />
          </button>
          <div className={`dropdown-menu ${switcherOpen ? "show" : ""}`}>
            {businesses.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`dropdown-item ${b.id === currentBusinessId ? "active" : ""}`}
                onClick={() => switchBusiness(b.id)}
              >
                {b.name}
              </button>
            ))}
            {me?.isSuperAdmin ? (
              <>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  id="topbar-manage-businesses-link"
                  className="dropdown-item"
                  onClick={() => {
                    setSwitcherOpen(false)
                    navigate(ROUTES.ADMIN.BUSINESSES)
                  }}
                >
                  <i className="fas fa-cogs mr-2" />
                  Manage businesses
                </button>
              </>
            ) : null}
          </div>
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
            {isBusinessAdmin ? (
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
                  <i className="fas fa-sliders-h mr-2" />
                  Business Settings
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
