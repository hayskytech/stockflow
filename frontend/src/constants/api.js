export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    CHANGE_PASSWORD: "/auth/change-password",
  },
  USERS: {
    LIST: "/users",
    BY_ID: (id) => `/users/${id}`,
  },
  WAREHOUSE: "/warehouse",
  DIVISIONS: {
    LIST: "/divisions",
    BY_ID: (id) => `/divisions/${id}`,
  },
  CATEGORIES: {
    LIST: "/categories",
    BY_ID: (id) => `/categories/${id}`,
  },
  SUB_CATEGORIES: {
    LIST: "/sub-categories",
    BY_ID: (id) => `/sub-categories/${id}`,
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
  },
  STOCK_LEDGER: "/stock-ledger",
  ORDERS: {
    LIST: "/orders",
    BY_ID: (id) => `/orders/${id}`,
    STATUS: (id) => `/orders/${id}/status`,
    PAYMENT_STATUS: (id) => `/orders/${id}/payment-status`,
  },
  REPORTS: {
    STOCK_SUMMARY: "/reports/stock-summary",
    ORDER_HISTORY: "/reports/order-history",
  },
  SETTINGS: {
    DELETE_ALL_DATA: "/settings/delete-all-data",
  },
}
