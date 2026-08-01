const PINCODE_LENGTH = 6

/**
 * Pincode input wired to a TanStack Form field — accepts digits only and hard-caps
 * length to 6, mirroring PhoneField's sanitize-on-type/paste approach.
 */
export function PincodeField({ id, field }) {
  function sanitize(raw) {
    return raw.replace(/\D/g, "").slice(0, PINCODE_LENGTH)
  }

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className="form-control"
        maxLength={PINCODE_LENGTH}
        value={field.state.value}
        onChange={(e) => field.handleChange(sanitize(e.target.value))}
        onPaste={(e) => {
          e.preventDefault()
          field.handleChange(sanitize(e.clipboardData.getData("text")))
        }}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 ? (
        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
      ) : null}
    </>
  )
}
