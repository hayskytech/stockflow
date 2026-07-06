export const APP_NAME = "StockFlow"
export const APP_TAGLINE = "From Warehouse to Store — Seamlessly"

export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  CUSTOMER: "customer",
}

export const MEDIA = {
  MAX_UPLOAD_MB: 15,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ENTITY_TYPES: {
    PRODUCT: "product",
  },
}

export const STORAGE_KEYS = {
  CART: "stockflow-cart",
  SCAN_SESSION: "stockflow-scan-session",
  DISPATCH_SCAN_SESSION: "stockflow-dispatch-scan-session",
}

/** Barcode-scan stock intake (see features/stock/pages/ScanStockPage.jsx). */
export const SCAN = {
  MAX_ITEMS: 500, // matches the backend scanImportSchema cap
  BARCODE_MAX_LENGTH: 50,
  VERIFY_BATCH_SIZE: 25, // flush the duplicate-check queue immediately at this size
  VERIFY_DEBOUNCE_MS: 800, // otherwise flush this long after the last scan
  DOUBLE_SCAN_GUARD_MS: 300, // ignore an identical scan re-fired within this window
}
