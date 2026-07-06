import { EmptyState } from "@/components/common/EmptyState"

const STATUS_BADGES = {
  checking: { label: "Checking…", className: "badge-light" },
  ok: { label: "OK", className: "badge-success" },
  unverified: { label: "Will verify on import", className: "badge-secondary" },
}

/** Scan-session list — newest scan first, conflicts highlighted for removal. */
export function ScannedItemsList({ items, onRemove }) {
  if (items.length === 0) {
    return <EmptyState icon="fa-barcode" title="Nothing scanned yet" description="Scanned barcodes will appear here." />
  }

  return (
    <div className="table-responsive" style={{ maxHeight: "50vh", overflowY: "auto" }}>
      <table className="table table-sm table-hover mb-0" id="scan-items-table">
        <thead>
          <tr>
            <th style={{ width: "4rem" }}>#</th>
            <th>Barcode</th>
            <th>Status</th>
            <th style={{ width: "4rem" }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.barcode} className={item.status === "conflict" ? "table-danger" : undefined}>
              <td>{items.length - index}</td>
              <td className="text-monospace">{item.barcode}</td>
              <td>
                {item.status === "conflict" ? (
                  <span className="badge badge-danger">
                    Already in stock{item.conflictProduct ? ` — ${item.conflictProduct}` : ""}
                  </span>
                ) : (
                  <span className={`badge ${STATUS_BADGES[item.status]?.className ?? "badge-light"}`}>
                    {STATUS_BADGES[item.status]?.label ?? item.status}
                  </span>
                )}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
