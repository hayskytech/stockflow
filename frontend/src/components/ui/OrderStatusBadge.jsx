const STATUS_STYLES = {
  pending: "badge-warning",
  accepted: "badge-info",
  rejected: "badge-danger",
  dispatched: "badge-primary",
  completed: "badge-success",
  cancelled: "badge-secondary",
}

/** Shared across the admin orders feature and the customer my-orders feature. */
export function OrderStatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "badge-secondary"}`}>{status}</span>
}
