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
  MEMBERS: "/members",
  // Global super-admin user directory (Phase 7) — the per-business `MEMBERS` route replaces
  // the old back-office `/users` pages, whose feature files stay on disk for Phase 7.
  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
    SESSIONS: "/users/sessions",
  },
  SETTINGS: "/settings",
  PROFILE: "/profile",
  // Global (non-tenant) routes — never prefixed with /b/:businessId.
  BUSINESSES: "/businesses",
  ADMIN: {
    BUSINESSES: "/admin/businesses",
    USERS: "/admin/users",
    USER_DETAIL: (id) => `/admin/users/${id}`,
    SESSIONS: "/admin/sessions",
  },
}

/** Route paths that are global — the `/b/:businessId` prefix must never be prepended to these. */
export const GLOBAL_ROUTE_RE = /^\/(login|change-password|profile|businesses|admin|b)(\/|$)/

/**
 * Builds an absolute back-office URL under a business: `businessPath(id, "/products")` →
 * `/b/<id>/products`. Back-office `ROUTES.*` values stay written as their bare paths
 * (`/products`, `/dashboard`, …); this helper — and the prefixing `Link`/`useAppNavigate`
 * wrappers in `lib/nav.jsx` / `hooks/use-app-navigate.js` — add the tenant segment at
 * navigation time, so the ~50 existing call sites did not have to change.
 */
export function businessPath(businessId, subpath = "") {
  if (!businessId) return subpath || ROUTES.BUSINESSES
  if (!subpath || subpath === "/") return `/b/${businessId}`
  if (subpath.startsWith("/b/") || GLOBAL_ROUTE_RE.test(subpath)) return subpath
  return `/b/${businessId}${subpath.startsWith("/") ? "" : "/"}${subpath}`
}

/**
 * Post-login / root landing target. A user who belongs to exactly one business (and is not a
 * super admin, who always gets the picker) goes straight to that business's dashboard;
 * everyone else lands on the business picker.
 */
export function landingPath(me) {
  const businesses = me?.businesses ?? []
  // A pure platform super admin (no business memberships) has nothing on the picker —
  // send them straight to the platform admin area.
  if (me?.isSuperAdmin && businesses.length === 0) {
    return ROUTES.ADMIN.BUSINESSES
  }
  if (!me?.isSuperAdmin && businesses.length === 1) {
    return businessPath(businesses[0].id, ROUTES.DASHBOARD)
  }
  return ROUTES.BUSINESSES
}

/**
 * @deprecated Superseded by `landingPath(me)`. Only still referenced by the unmounted
 * storefront `RegisterPage`; kept so that subtree keeps resolving. Remove when the
 * storefront auth pages are reworked for multi-tenancy.
 */
export function landingPathForRole() {
  return ROUTES.BUSINESSES
}
