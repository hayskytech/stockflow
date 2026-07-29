import { ROUTES } from "@/constants/routes"

const DASHBOARD_CRUMB = { label: "Dashboard", to: ROUTES.DASHBOARD }

/** Every trail starts at Dashboard — `items` are the remaining segments, last one being the current page (no link). */
function trail(...items) {
  return [DASHBOARD_CRUMB, ...items]
}

// Keyed to match each route's `handle.crumb` in app/router.jsx.
export const CRUMBS = {
  DASHBOARD: () => [DASHBOARD_CRUMB],
  WAREHOUSE: () => trail({ label: "Warehouse" }),
  DIVISIONS: () => trail({ label: "Divisions" }),
  CATEGORIES: () => trail({ label: "Categories" }),
  PRODUCTS_LIST: () => trail({ label: "Products" }),
  PRODUCTS_NEW: () => trail({ label: "Products", to: ROUTES.PRODUCTS.LIST }, { label: "Add Product" }),
  PRODUCTS_DETAIL: () => trail({ label: "Products", to: ROUTES.PRODUCTS.LIST }, { label: "Product Details" }),
  PRODUCTS_EDIT: () => trail({ label: "Products", to: ROUTES.PRODUCTS.LIST }, { label: "Edit Product" }),
  STOCK_LIST: () => trail({ label: "Stock" }),
  STOCK_LEDGER: () => trail({ label: "Stock Ledger" }),
  MEDIA_LIST: () => trail({ label: "Media Library" }),
  MEDIA_DETAIL: () => trail({ label: "Media Library", to: ROUTES.MEDIA_LIBRARY.LIST }, { label: "Media Details" }),
  HERO_SLIDES: () => trail({ label: "Homepage Sliders" }),
  ORDERS_LIST: () => trail({ label: "Orders" }),
  ORDERS_NEW: () => trail({ label: "Orders", to: ROUTES.ORDERS.LIST }, { label: "New Order" }),
  ORDERS_DETAIL: () => trail({ label: "Orders", to: ROUTES.ORDERS.LIST }, { label: "Order Details" }),
  ORDERS_DISPATCH: () => trail({ label: "Orders", to: ROUTES.ORDERS.LIST }, { label: "Dispatch Order" }),
  DISPATCHES_LIST: () => trail({ label: "Dispatches" }),
  DISPATCHES_DETAIL: () => trail({ label: "Dispatches", to: ROUTES.DISPATCHES.LIST }, { label: "Dispatch Details" }),
  REPORTS: () => trail({ label: "Reports" }),
  USERS: () => trail({ label: "Users / Staff" }),
  USERS_DETAIL: () => trail({ label: "Users / Staff", to: ROUTES.USERS.LIST }, { label: "User Details" }),
  SETTINGS: () => trail({ label: "Settings" }),
  PROFILE: () => trail({ label: "My Profile" }),
}
