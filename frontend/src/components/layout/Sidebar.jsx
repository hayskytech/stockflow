import { NavLink } from "react-router-dom"
import { ROUTES } from "@/constants/routes"
import { APP_NAME } from "@/constants/app"

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, icon: "fa-gauge", label: "Dashboard" },
  { to: ROUTES.WAREHOUSE, icon: "fa-warehouse", label: "Warehouse" },
  { to: ROUTES.CATALOG.DIVISIONS, icon: "fa-sitemap", label: "Divisions" },
  { to: ROUTES.CATALOG.CATEGORIES, icon: "fa-tags", label: "Categories" },
  { to: ROUTES.PRODUCTS.LIST, icon: "fa-shirt", label: "Products" },
  { to: ROUTES.STOCK_LEDGER, icon: "fa-book", label: "Stock Ledger" },
  { to: ROUTES.MEDIA_LIBRARY, icon: "fa-images", label: "Media Library" },
  { to: ROUTES.ORDERS.LIST, icon: "fa-cart-shopping", label: "Orders" },
  { to: ROUTES.DISPATCHES, icon: "fa-truck", label: "Dispatches" },
  { to: ROUTES.REPORTS, icon: "fa-chart-line", label: "Reports" },
  { to: ROUTES.USERS.LIST, icon: "fa-users", label: "Users / Staff" },
]

export function Sidebar() {
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <a href={ROUTES.DASHBOARD} className="brand-link">
        <span className="brand-text font-weight-light ml-2">{APP_NAME}</span>
      </a>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
            {NAV_ITEMS.map((item) => (
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
