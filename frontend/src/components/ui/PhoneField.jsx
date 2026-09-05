import { useAppSettings } from "@/hooks/use-business-settings"

/**
 * Phone input wired to a TanStack Form field — shows the admin-configured country code as a
 * fixed prefix, accepts digits only, and hard-caps length to the admin-configured digit count.
 * Non-digit paste content is stripped automatically rather than rejected outright.
 */
export function PhoneField({ id, field }) {
  const { phoneCountryCode, phoneNumberLength } = useAppSettings()

  function sanitize(raw) {
    return raw.replace(/\D/g, "").slice(0, phoneNumberLength)
  }

  return (
    <>
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">{phoneCountryCode}</span>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          className="form-control"
          maxLength={phoneNumberLength}
          value={field.state.value}
          onChange={(e) => field.handleChange(sanitize(e.target.value))}
          onPaste={(e) => {
            e.preventDefault()
            field.handleChange(sanitize(e.clipboardData.getData("text")))
          }}
          onBlur={field.handleBlur}
        />
      </div>
      {field.state.meta.errors.length > 0 ? (
        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
      ) : null}
    </>
  )
}
