/** Bootstrap pagination footer shared by any paginated list — admin tables (DataTable)
 *  and customer-facing grids (Category page) alike. Renders nothing for a single page. */
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
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
  )
}
