import { EmptyState } from "@/components/common/EmptyState"

/**
 * Generic paginated table shell shared across list pages (catalog, products, ...).
 * `columns` is [{ key, label, render?: (row) => node, className? }].
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  isLoading,
  isError,
  errorMessage = "Could not load data. Please try again.",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isError) {
    return <div className="alert alert-danger">{errorMessage}</div>
  }

  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="d-flex justify-content-end">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button type="button" className="page-link" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                Previous
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                Page {page} of {totalPages}
              </span>
            </li>
            <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
