export const ROUTES = {
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    CHANGE_PASSWORD: "/change-password",
  },
  STORE: {
    HOME: "/store",
    COMPLETE_PROFILE: "/store/complete-profile",
    PRODUCT_DETAIL: (id) => `/store/products/${id}`,
    DIVISION_DETAIL: (id) => `/store/divisions/${id}`,
    CATEGORY_DETAIL: (id) => `/store/categories/${id}`,
    CART: "/store/cart",
    CHECKOUT: "/store/checkout",
    ORDERS: "/store/orders",
    ORDER_DETAIL: (id) => `/store/orders/${id}`,
  },
  DASHBOARD: "/dashboard",
  WAREHOUSE: "/warehouse",
  CATALOG: {
    DIVISIONS: "/catalog/divisions",
    DIVISION_DETAIL: (id) => `/catalog/divisions/${id}`,
    CATEGORIES: "/catalog/categories",
    CATEGORY_DETAIL: (id) => `/catalog/categories/${id}`,
  },
  SIZES: "/sizes",
  PRODUCTS: {
    LIST: "/products",
    NEW: "/products/new",
    DETAIL: (id) => `/products/${id}`,
    EDIT: (id) => `/products/${id}/edit`,
  },
  STOCK: {
    LIST: "/stock",
  },
  STOCK_LEDGER: "/stock-ledger",
  MEDIA_LIBRARY: {
    LIST: "/media-library",
    DETAIL: (id) => `/media-library/${id}`,
  },
  HERO_SLIDES: "/hero-slides",
  NOTICE: "/notice",
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
