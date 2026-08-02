import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/**
 * Three-dot row-actions dropdown for table rows. `actions` is
 * [{ key, label, icon, onClick, variant }] — variant "danger" renders in red.
 * Falsy entries in `actions` (e.g. `condition && {...}`) are skipped.
 *
 * The menu is portaled to `document.body` and positioned with `fixed`
 * coordinates from the toggle button's rect. Row menus live inside
 * `.table-responsive`, and Bootstrap's `overflow-x: auto` on that wrapper
 * forces `overflow-y` to compute as `auto` too (CSS spec: either axis set
 * to non-`visible` forces the other), which clips/misaligns an
 * absolutely-positioned dropdown-menu near the table's edges. Fixed
 * positioning in a portal sidesteps that clipping entirely.
 */
export function RowActionsMenu({ actions }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const visibleActions = actions.filter(Boolean)

  useEffect(() => {
    if (!open) return undefined
    function handleOutsideClick(event) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function close() {
      setOpen(false)
    }
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: "auto",
      right: window.innerWidth - rect.right,
      zIndex: 1050,
      minWidth: "auto",
      width: "max-content",
    })
  }, [open])

  if (visibleActions.length === 0) return null

  return (
    <div className="dropdown d-inline-block">
      <button
        type="button"
        ref={buttonRef}
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-label="Row actions"
      >
        <i className="fas fa-ellipsis-vertical" />
      </button>
      {open && menuStyle
        ? createPortal(
            <div className="dropdown-menu show" ref={menuRef} style={menuStyle}>
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
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
