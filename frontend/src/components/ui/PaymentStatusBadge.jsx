const PAYMENT_STATUS_STYLES = {
  pending: "badge-warning",
  verified: "badge-success",
  rejected: "badge-danger",
}

/** Shared across the admin orders feature and the customer my-orders feature. */
export function PaymentStatusBadge({ status }) {
  return <span className={`badge ${PAYMENT_STATUS_STYLES[status] ?? "badge-secondary"}`}>{status}</span>
}
