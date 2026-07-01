export const ROUTES = {
  AUTH: {
    LOGIN: "/login",
    CHANGE_PASSWORD: "/change-password",
  },
  DASHBOARD: "/dashboard",
  WAREHOUSE: "/warehouse",
  CATALOG: {
    DIVISIONS: "/catalog/divisions",
    CATEGORIES: "/catalog/categories",
  },
  PRODUCTS: {
    LIST: "/products",
    NEW: "/products/new",
    EDIT: (id) => `/products/${id}/edit`,
  },
  STOCK_LEDGER: "/stock-ledger",
  MEDIA_LIBRARY: "/media-library",
  ORDERS: {
    LIST: "/orders",
    DETAIL: (id) => `/orders/${id}`,
  },
  DISPATCHES: "/dispatches",
  REPORTS: "/reports",
  USERS: {
    LIST: "/users",
  },
}
