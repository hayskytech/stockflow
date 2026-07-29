export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
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
  DIVISIONS: {
    LIST: "/divisions",
    BY_ID: (id) => `/divisions/${id}`,
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
  },
  STOCK: {
    LIST: "/stock",
    BY_ID: (id) => `/stock/${id}`,
    IMPORT: "/stock/import",
    CREATE: "/stock",
    BARCODE_STATUS: "/stock/barcode-status",
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
    BARCODE_STATUS: "/dispatches/barcode-status",
    IMPORT: "/dispatches/import",
  },
  REPORTS: {
    STOCK_SUMMARY: "/reports/stock-summary",
    ORDER_HISTORY: "/reports/order-history",
    STOCK_MOVEMENT: "/reports/stock-movement",
  },
  SETTINGS: {
    DELETE_ALL_DATA: "/settings/delete-all-data",
  },
}
