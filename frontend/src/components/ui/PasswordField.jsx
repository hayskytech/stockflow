import { useState } from "react"

/** Password input with a show/hide toggle, wired to a TanStack Form field. */
export function PasswordField({ id, placeholder, field }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="input-group mb-3">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="form-control"
        placeholder={placeholder}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <div className="input-group-append">
        <button
          type="button"
          className="input-group-text"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
        >
          <i className={visible ? "fas fa-eye-slash" : "fas fa-eye"} />
        </button>
      </div>
      {field.state.meta.errors.length > 0 ? (
        <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
      ) : null}
    </div>
  )
}
