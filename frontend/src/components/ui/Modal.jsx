/**
 * Bootstrap-styled modal wrapper — controlled via the `open` prop, shared across feature
 * form modals. Clicking the backdrop closes it; pass `closeOnBackdrop={false}` for modals
 * where an accidental click would lose meaningful user input.
 */
export function Modal({ open, title, onClose, children, footer, closeOnBackdrop = true }) {
  if (!open) return null

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      style={{ background: "rgba(0,0,0,0.5)", overflowY: "auto" }}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="close" onClick={onClose} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
