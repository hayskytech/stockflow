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

/** The landing route for a user after login/registration, based on their role. */
export function landingPathForRole(role) {
  return role === "customer" ? ROUTES.STORE.HOME : ROUTES.DASHBOARD
}
