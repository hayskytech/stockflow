/**
 * Numeric input wired to a TanStack Form field. Blurs on wheel so scrolling the page
 * over the field never changes its value (a bare `type="number"` input does by default).
 */
export function NumberField({ id, field, min, max, step = "1", placeholder, disabled, className = "form-control" }) {
  return (
    <>
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
        onChange={(e) => field.handleChange(e.target.valueAsNumber || 0)}
        onBlur={field.handleBlur}
        onWheel={(e) => e.currentTarget.blur()}
      />
      {field.state.meta.errors.length > 0 ? (
        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
      ) : null}
    </>
  )
}
