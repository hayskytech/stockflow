export const ROUTES = {
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    CHANGE_PASSWORD: "/change-password",
  },
  STORE: {
    HOME: "/store",
    PRODUCT_DETAIL: (id) => `/store/products/${id}`,
    CART: "/store/cart",
    CHECKOUT: "/store/checkout",
    ORDERS: "/store/orders",
    ORDER_DETAIL: (id) => `/store/orders/${id}`,
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
    DETAIL: (id) => `/products/${id}`,
    EDIT: (id) => `/products/${id}/edit`,
  },
  STOCK: {
    LIST: "/stock",
    SCAN: "/stock/scan",
  },
  STOCK_LEDGER: "/stock-ledger",
  MEDIA_LIBRARY: {
    LIST: "/media-library",
    DETAIL: (id) => `/media-library/${id}`,
  },
  ORDERS: {
    LIST: "/orders",
    NEW: "/orders/new",
    DETAIL: (id) => `/orders/${id}`,
    DISPATCH: (id) => `/orders/${id}/dispatch`,
  },
  DISPATCHES: {
    LIST: "/dispatches",
    DETAIL: (id) => `/dispatches/${id}`,
  },
  REPORTS: "/reports",
  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
  },
  SETTINGS: "/settings",
  PROFILE: "/profile",
}

/** The landing route for a user after login/registration, based on their role. */
export function landingPathForRole(role) {
  return role === "customer" ? ROUTES.STORE.HOME : ROUTES.DASHBOARD
}
