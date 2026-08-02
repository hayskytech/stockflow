/** Shared across the admin orders feature and the customer my-orders feature. */
export function BackorderBadge() {
  return (
    <span className="badge badge-warning">
      <i className="fas fa-clock mr-1" />
      Back-order
    </span>
  )
}
