import { useEffect, useRef, useState } from "react"

/**
 * Three-dot row-actions dropdown for table rows. `actions` is
 * [{ key, label, icon, onClick, variant }] — variant "danger" renders in red.
 * Falsy entries in `actions` (e.g. `condition && {...}`) are skipped.
 */
export function RowActionsMenu({ actions }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const visibleActions = actions.filter(Boolean)

  useEffect(() => {
    if (!open) return undefined
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  if (visibleActions.length === 0) return null

  return (
    <div className={`dropdown ${open ? "show" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-label="Row actions"
      >
        <i className="fas fa-ellipsis-vertical" />
      </button>
      <div className={`dropdown-menu dropdown-menu-right ${open ? "show" : ""}`}>
        {visibleActions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={`dropdown-item ${action.variant === "danger" ? "text-danger" : ""}`}
            onClick={() => {
              setOpen(false)
              action.onClick()
            }}
          >
            {action.icon ? <i className={`fas ${action.icon} mr-2`} /> : null}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
