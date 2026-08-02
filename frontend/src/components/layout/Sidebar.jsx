import { Link, NavLink } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"
import { ROLES } from "@/constants/app"

// Warehouse settings live in the topbar user dropdown (see Topbar.jsx), not here.
const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, icon: "fa-gauge", label: "Dashboard" },
  { to: ROUTES.CATALOG.DIVISIONS, icon: "fa-sitemap", label: "Divisions" },
  { to: ROUTES.CATALOG.CATEGORIES, icon: "fa-tags", label: "Categories" },
  { to: ROUTES.SIZES, icon: "fa-ruler", label: "Sizes" },
  { to: ROUTES.PRODUCTS.LIST, icon: "fa-shirt", label: "Products" },
  { to: ROUTES.STOCK.LIST, icon: "fa-boxes", label: "Stock" },
  { to: ROUTES.STOCK_LEDGER, icon: "fa-book", label: "Stock Ledger" },
  { to: ROUTES.MEDIA_LIBRARY.LIST, icon: "fa-images", label: "Media Library" },
  { to: ROUTES.HERO_SLIDES, icon: "fa-photo-film", label: "Homepage Sliders", adminOnly: true },
  { to: ROUTES.NOTICE, icon: "fa-bullhorn", label: "Notice Board", adminOnly: true },
  { to: ROUTES.ORDERS.LIST, icon: "fa-cart-shopping", label: "Orders" },
  { to: ROUTES.DISPATCHES.LIST, icon: "fa-truck", label: "Dispatches" },
  { to: ROUTES.REPORTS, icon: "fa-chart-line", label: "Reports" },
  { to: ROUTES.USERS.LIST, icon: "fa-users", label: "Users / Staff", adminOnly: true },
]

export function Sidebar() {
  const isAdmin = useAuthStore((s) => s.user?.role === ROLES.ADMIN)
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const siteTitle = useSiteTitle()

  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <Link to={ROUTES.DASHBOARD} className="brand-link">
        <span className="brand-text font-weight-light ml-2">{siteTitle}</span>
      </Link>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
            {navItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  <i className={`nav-icon fas ${item.icon}`} />
                  <p>{item.label}</p>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
