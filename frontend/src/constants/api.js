export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

/** Machine-readable `details.code` values the API attaches to errors that need branching on,
 *  rather than just displaying — matching on the human message would break the moment it changes. */
export const API_ERROR_CODES = {
  OTP_INVALID: "OTP_INVALID",
}

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    OTP_SEND: "/auth/otp/send",
    OTP_LOGIN: "/auth/otp/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    COMPLETE_PROFILE: "/auth/complete-profile",
    CHANGE_PASSWORD: "/auth/change-password",
    MY_SESSIONS: "/users/me/sessions",
    MY_SESSION_BY_ID: (sessionId) => `/users/me/sessions/${sessionId}`,
  },
  USERS: {
    LIST: "/users",
    BY_ID: (id) => `/users/${id}`,
  },
  WAREHOUSE: "/warehouse",
  WAREHOUSE_PUBLIC: "/warehouse/public",
  NOTICE: "/notice",
  NOTICE_PUBLIC: "/notice/public",
  DIVISIONS: {
    LIST: "/divisions",
    BY_ID: (id) => `/divisions/${id}`,
    BULK_IMPORT: "/divisions/bulk-import",
    REORDER: "/divisions/reorder",
  },
  CATEGORIES: {
    LIST: "/categories",
    BY_ID: (id) => `/categories/${id}`,
    REORDER: "/categories/reorder",
  },
  SUB_CATEGORIES: {
    LIST: "/sub-categories",
    BY_ID: (id) => `/sub-categories/${id}`,
    REORDER: "/sub-categories/reorder",
  },
  PRODUCTS: {
    LIST: "/products",
    BY_ID: (id) => `/products/${id}`,
    IMPORT: "/products/import",
    IMPORT_TEMPLATE: "/products/import-template",
  },
  SIZES: {
    LIST: "/sizes",
    BY_ID: (id) => `/sizes/${id}`,
    REORDER: "/sizes/reorder",
  },
  STOCK: {
    LIST: "/stock",
    BY_ID: (id) => `/stock/${id}`,
    IMPORT: "/stock/import",
    IMPORT_TEMPLATE: "/stock/import-template",
    CREATE: "/stock",
  },
  MEDIA: {
    LIST: "/media",
    UPLOAD: "/media",
    BY_ID: (id) => `/media/${id}`,
    USAGE: (id) => `/media/${id}/usage`,
    RELATED: (id) => `/media/${id}/related`,
    FILE: (id) => `/media/${id}/file`,
  },
  HERO_SLIDES: {
    LIST: "/hero-slides",
    PUBLIC: "/hero-slides/public",
    BY_ID: (id) => `/hero-slides/${id}`,
    REORDER: "/hero-slides/reorder",
  },
  STOCK_LEDGER: "/stock-ledger",
  ORDERS: {
    LIST: "/orders",
    CREATE: "/orders",
    BY_ID: (id) => `/orders/${id}`,
    STATUS: (id) => `/orders/${id}/status`,
    PAYMENT_STATUS: (id) => `/orders/${id}/payment-status`,
  },
  DISPATCHES: {
    LIST: "/dispatches",
    CREATE: "/dispatches",
    BY_ID: (id) => `/dispatches/${id}`,
  },
  REPORTS: {
    STOCK_SUMMARY: "/reports/stock-summary",
    ORDER_HISTORY: "/reports/order-history",
    STOCK_MOVEMENT: "/reports/stock-movement",
    MONTHLY_ORDERS: "/reports/monthly-orders",
  },
  SETTINGS: {
    DELETE_ALL_DATA: "/settings/delete-all-data",
    SOCIAL_LINKS: "/settings/social",
    SOCIAL_LINKS_PUBLIC: "/settings/social/public",
    BRANDING: "/settings/branding",
    BRANDING_PUBLIC: "/settings/branding/public",
  },
}
