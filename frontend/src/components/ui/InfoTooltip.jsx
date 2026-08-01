import { useState } from "react"

/** Lightweight hover/focus tooltip — pure CSS positioning, no Bootstrap JS init required. */
export function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="position-relative d-inline-block ml-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <i className="fas fa-info-circle text-muted" tabIndex={0} role="button" aria-label={text} style={{ fontSize: "0.85em" }} />
      {visible ? (
        <span
          className="position-absolute bg-dark text-light rounded p-2"
          style={{
            bottom: "125%",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "normal",
            width: "max-content",
            maxWidth: "180px",
            fontSize: "0.8rem",
            zIndex: 1045,
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  )
}
