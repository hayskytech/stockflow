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
    CATEGORY_DETAIL: (id) => `/store/categories/${id}`,
    CART: "/store/cart",
    CHECKOUT: "/store/checkout",
    ORDERS: "/store/orders",
    ORDER_DETAIL: (id) => `/store/orders/${id}`,
  },
  DASHBOARD: "/dashboard",
  WAREHOUSE: "/warehouse",
  CATALOG: {
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
    SESSIONS: "/users/sessions",
  },
  SETTINGS: "/settings",
  PROFILE: "/profile",
}

/**
 * The landing route for a user after login. Only admin/staff log in now (the storefront and
 * customer login are unmounted — see multitenant_plan.md Phase 1), so this is always the dashboard.
 * Kept as a function because call sites still use it and Phase 6 will reintroduce per-user landing.
 */
export function landingPathForRole() {
  return ROUTES.DASHBOARD
}
