import { useAppSettings } from "@/hooks/use-business-settings"

/**
 * The code step of an OTP flow — reached only after a code has actually been sent, so the phone
 * number is settled by the time this renders.
 *
 * That leaves exactly three things worth offering here: type the code, ask for another one, or go
 * back and correct the number. Shared by sign-in and registration, which differ only in `purpose`
 * (decided by the sender) and in what happens after the code is accepted.
 */
export function OtpCodeStep({ id, field, sender, error, onChangePhone }) {
  const { phoneCountryCode } = useAppSettings()

  const resendLabel = () => {
    if (sender.isPending) return "Sending…"
    if (sender.secondsLeft > 0) return `Resend in ${sender.secondsLeft}s`
    return "Resend code"
  }

  return (
    <div className="form-group">
      <p className="text-muted small mb-2">
        Code sent to{" "}
        <strong>
          {phoneCountryCode} {sender.sentTo}
        </strong>
        .{" "}
        <button
          id={`${id}-change-phone`}
          type="button"
          className="btn btn-link btn-sm p-0 align-baseline"
          onClick={onChangePhone}
        >
          Change number
        </button>
      </p>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        // MSG91's dashboard decides the code length (4 and 6 are both common), so this accepts a
        // range rather than pinning a length that could change under us.
        maxLength={8}
        className="form-control"
        placeholder="Verification code"
        autoFocus
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
        onBlur={field.handleBlur}
      />

      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">It may take a few seconds to arrive.</small>
        {/* Resends to `sentTo`, never to whatever is currently in the phone field — a code is only
            ever valid for the number it was issued against. */}
        <button
          id={`${id}-resend`}
          type="button"
          className="btn btn-link btn-sm p-0"
          disabled={sender.isPending || sender.secondsLeft > 0}
          onClick={() => sender.send(sender.sentTo)}
        >
          {resendLabel()}
        </button>
      </div>

      {sender.error ? <div className="invalid-feedback d-block">{sender.error}</div> : null}
      {error ? <div className="invalid-feedback d-block">{error}</div> : null}
      {field.state.meta.errors.length > 0 ? (
        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
      ) : null}
    </div>
  )
}
