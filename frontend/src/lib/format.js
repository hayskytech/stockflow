/** Defaults match the Business Settings phone/currency defaults — pass `symbol`/`decimalDigits`
 *  (see `useFormatMoney` in hooks/use-business-settings.js) to reflect the per-business values. */
export function formatMoney(value, { symbol = "₹", decimalDigits = 2 } = {}) {
  return `${symbol}${Number(value).toFixed(decimalDigits)}`
}

/** Derives the stock badge label + Bootstrap contextual class from stock levels. */
export function stockBadge(quantityAvailable, reorderLevel) {
  if (quantityAvailable <= 0) return { label: "Out of stock", className: "badge-danger" }
  if (quantityAvailable <= reorderLevel) return { label: "Low stock", className: "badge-warning" }
  return { label: "In stock", className: "badge-success" }
}

/**
 * Converts a UTC datetime (as returned by the API) to an IST display string — the one place
 * this conversion happens. The backend's mysql2 pool uses `dateStrings: true`, so timestamps
 * arrive as naive `"YYYY-MM-DD HH:mm:ss"` strings with no `Z` suffix — parsed as-is, JS would
 * treat them as *local* time instead of UTC. Normalize to ISO-with-`Z` first so the browser
 * always interprets them as UTC before converting to IST.
 */
/**
 * Formats a date-only string ("YYYY-MM-DD") for display. No timezone conversion — a plain
 * date has no time component to shift, so converting would move it across midnight.
 */
export function formatDateIST(value) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTimeIST(value) {
  if (!value) return ""
  const isoUtc = value.includes("T") ? value : `${value.replace(" ", "T")}Z`
  return new Date(isoUtc).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
