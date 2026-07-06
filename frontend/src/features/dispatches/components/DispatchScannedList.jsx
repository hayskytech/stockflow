const STATUS_META = {
  checking: { badge: "badge-secondary", label: "Checking…" },
  matched: { badge: "badge-success", label: "Matched" },
  swap: { badge: "badge-info", label: "Swap" },
  wrong_product: { badge: "badge-danger", label: "Not on order" },
  unavailable: { badge: "badge-danger", label: "Unavailable" },
  unknown: { badge: "badge-danger", label: "Not in stock" },
  unverified: { badge: "badge-warning", label: "Unverified" },
}

const PROBLEM_STATUSES = new Set(["wrong_product", "unavailable", "unknown"])

/** Scanned units for a dispatch, newest first — problem rows are highlighted for removal. */
export function DispatchScannedList({ items, onRemove }) {
  if (items.length === 0) {
    return (
      <p className="text-muted mb-0" id="dispatch-scan-empty">
        No units scanned yet — scan the first barcode to begin.
      </p>
    )
  }

  return (
    <div className="table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
      <table className="table table-sm table-hover mb-0" id="dispatch-scanned-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Barcode</th>
            <th>Product</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.checking
            return (
              <tr key={item.barcode} className={PROBLEM_STATUSES.has(item.status) ? "table-danger" : ""}>
                <td className="text-muted">{items.length - index}</td>
                <td>{item.barcode}</td>
                <td>{item.productName ?? <span className="text-muted">—</span>}</td>
                <td>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-danger"
                    title="Remove"
                    onClick={() => onRemove(item.barcode)}
                  >
                    <i className="fas fa-times" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
