/**
 * Numeric input wired to a TanStack Form field. Blurs on wheel so scrolling the page
 * over the field never changes its value (a bare `type="number"` input does by default).
 */
export function NumberField({ id, field, min, max, step = "1", placeholder, disabled, className = "form-control", prefix, suffix }) {
  const input = (
    <input
      id={id}
      type="number"
      className={className}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      value={field.state.value}
      onChange={(e) => {
        const { value, valueAsNumber } = e.target
        // Keep the raw string while empty or mid-typing (e.g. "-", "1.") instead of
        // snapping to 0, which made the field impossible to clear or edit past a NaN state.
        field.handleChange(value === "" || Number.isNaN(valueAsNumber) ? value : valueAsNumber)
      }}
      onBlur={field.handleBlur}
      onWheel={(e) => e.currentTarget.blur()}
    />
  )

  return (
    <>
      {prefix || suffix ? (
        <div className="input-group">
          {prefix ? (
            <div className="input-group-prepend">
              <span className="input-group-text">{prefix}</span>
            </div>
          ) : null}
          {input}
          {suffix ? (
            <div className="input-group-append">
              <span className="input-group-text">{suffix}</span>
            </div>
          ) : null}
        </div>
      ) : (
        input
      )}
      {field.state.meta.errors.length > 0 ? (
        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
      ) : null}
    </>
  )
}
