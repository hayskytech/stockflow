import { useEffect, useRef, useState } from "react"
import { EmptyState } from "@/components/common/EmptyState"
import { Pagination } from "@/components/common/Pagination"

/** Persists which hideable columns are hidden, keyed per-table, so the choice survives a reload. */
function useHiddenColumns(tableKey, hideableKeys) {
  const storageKey = `stockflow-columns-${tableKey}`
  const [hidden, setHidden] = useState(() => {
    if (!tableKey) return []
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]")
      return Array.isArray(stored) ? stored.filter((k) => hideableKeys.includes(k)) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!tableKey) return
    localStorage.setItem(storageKey, JSON.stringify(hidden))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, hidden])

  function toggle(key) {
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return { hidden, toggle }
}

function ColumnsMenu({ columns, hidden, onToggle, tableKey }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  const hideableColumns = columns.filter((c) => c.hideable)
  if (hideableColumns.length === 0) return null

  return (
    <div className="d-flex justify-content-end mb-2">
      <div className={`dropdown ${open ? "show" : ""}`} ref={containerRef}>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpen((v) => !v)}>
          <i className="fas fa-table-columns mr-1" />
          Columns
        </button>
        <div className={`dropdown-menu dropdown-menu-right p-2 ${open ? "show" : ""}`}>
          {hideableColumns.map((col) => (
            <div className="form-check" key={col.key}>
              <input
                type="checkbox"
                className="form-check-input"
                id={`col-toggle-${tableKey}-${col.key}`}
                checked={!hidden.includes(col.key)}
                onChange={() => onToggle(col.key)}
              />
              <label className="form-check-label" htmlFor={`col-toggle-${tableKey}-${col.key}`}>
                {col.label || col.key}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Generic paginated table shell shared across list pages (catalog, products, ...).
 * `columns` is [{ key, label, render?: (row) => node, className?, hideable? }].
 * Pass `tableKey` to enable a "Columns" show/hide toggle (persisted to localStorage)
 * for any column marked `hideable: true`. Pass `getRowProps(row)` to spread extra
 * props (e.g. drag-and-drop handlers) onto each `<tr>`.
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
  emptyAction,
  page = 1,
  totalPages = 1,
  onPageChange,
  tableKey,
  getRowProps,
}) {
  const hideableKeys = columns.filter((c) => c.hideable).map((c) => c.key)
  const { hidden, toggle } = useHiddenColumns(tableKey, hideableKeys)
  const visibleColumns = tableKey ? columns.filter((c) => !hidden.includes(c.key)) : columns

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
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
  }

  return (
    <div>
      {tableKey ? <ColumnsMenu columns={columns} hidden={hidden} onToggle={toggle} tableKey={tableKey} /> : null}

      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} {...(getRowProps ? getRowProps(row) : null)}>
                {visibleColumns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
