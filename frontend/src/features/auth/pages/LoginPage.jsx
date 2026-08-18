import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { loginApi } from "@/features/auth/auth.api"
import { loginSchema, otpLoginSchema, requestOtpSchema } from "@/features/auth/auth.schema"
import { OtpCodeStep } from "@/features/auth/components/OtpCodeStep"
import { PasswordField } from "@/components/ui/PasswordField"
import { useOtpLogin, useOtpSender } from "@/features/auth/hooks/use-otp"
import { PhoneField } from "@/components/ui/PhoneField"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { apiErrorMessage } from "@/lib/errors"
import { ROUTES, landingPathForRole } from "@/constants/routes"

const MODES = { OTP: "otp", PASSWORD: "password" }

/** Phone first, code second — the code field only appears once a code is actually on its way. */
const OTP_STEPS = { PHONE: "phone", CODE: "code" }

export function LoginPage() {
  // Phone + OTP is the default: it is the only method that needs no remembered secret, and it is
  // how storefront customers sign in. Admin/staff fall back to the password tab with their email.
  const [mode, setMode] = useState(MODES.OTP)
  const [otpStep, setOtpStep] = useState(OTP_STEPS.PHONE)
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const siteTitle = useSiteTitle()
  const otpLogin = useOtpLogin()
  const sender = useOtpSender("login")

  function completeLogin({ user, accessToken }) {
    setAuth(user, accessToken)

    // An OTP login creates the account when the number is new, so the very first thing a brand-new
    // customer sees is the form that turns a verified phone into a profile — not an error telling
    // them to go and register the number they just proved they hold.
    if (user.profileComplete === false) {
      navigate(ROUTES.STORE.COMPLETE_PROFILE, { replace: true })
      return
    }

    navigate(landingPathForRole(user.role), { replace: true })
  }

  function switchMode(next) {
    setServerError("")
    setMode(next)
  }

  const otpForm = useForm({
    defaultValues: { phone: "", otp: "" },
    validators: { onSubmit: otpLoginSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        completeLogin(await otpLogin.mutateAsync(value))
      } catch (err) {
        setServerError(apiErrorMessage(err, "Incorrect or expired code. Request a new one."))
      }
    },
  })

  const passwordForm = useForm({
    defaultValues: { identifier: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        completeLogin(await loginApi(value))
      } catch (err) {
        setServerError(apiErrorMessage(err, "Invalid credentials"))
      }
    },
  })

  /** One form, two steps — the submit button means "send me a code" on the first and "sign me in"
   *  on the second, so Enter and the button always do whatever the visible step is asking for. */
  async function submitOtpStep(event) {
    event.preventDefault()
    setServerError("")

    if (otpStep === OTP_STEPS.PHONE) {
      if (await sender.send(otpForm.getFieldValue("phone"))) setOtpStep(OTP_STEPS.CODE)
      return
    }

    otpForm.handleSubmit()
  }

  /** Going back invalidates whatever was typed — a code only ever belongs to one number. */
  function backToPhoneStep() {
    setServerError("")
    otpForm.setFieldValue("otp", "")
    setOtpStep(OTP_STEPS.PHONE)
  }

  return (
    <div className="login-page storefront">
      <div className="login-box">
        <div className="login-logo">
          <Link to={ROUTES.STORE.HOME}>
            <b>{siteTitle}</b>
          </Link>
        </div>
        <div className="zari-rule zari-rule--sm auth-box-rule" aria-hidden="true" />

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Sign in to continue</p>

            <div className="btn-group btn-block mb-3" role="group" aria-label="Sign-in method">
              <button
                id="login-mode-otp"
                type="button"
                className={`btn ${mode === MODES.OTP ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => switchMode(MODES.OTP)}
              >
                Phone &amp; OTP
              </button>
              <button
                id="login-mode-password"
                type="button"
                className={`btn ${mode === MODES.PASSWORD ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => switchMode(MODES.PASSWORD)}
              >
                Password
              </button>
            </div>

            {mode === MODES.OTP ? (
              <form onSubmit={submitOtpStep}>
                {otpStep === OTP_STEPS.PHONE ? (
                  <>
                    <otpForm.Field name="phone">
                      {(field) => (
                        <div className="mb-3">
                          <PhoneField id="login-phone" field={field} />
                        </div>
                      )}
                    </otpForm.Field>

                    {sender.error ? <div className="alert alert-danger py-2">{sender.error}</div> : null}

                    <otpForm.Subscribe selector={(state) => state.values.phone}>
                      {(phone) => (
                        <button
                          id="login-otp-send"
                          type="submit"
                          className="btn btn-primary btn-block"
                          disabled={!requestOtpSchema.safeParse({ phone }).success || sender.isPending}
                        >
                          {sender.isPending ? "Sending…" : "Send Code"}
                        </button>
                      )}
                    </otpForm.Subscribe>
                  </>
                ) : (
                  <>
                    <otpForm.Field name="otp">
                      {(field) => (
                        <OtpCodeStep
                          id="login-otp"
                          field={field}
                          sender={sender}
                          onChangePhone={backToPhoneStep}
                        />
                      )}
                    </otpForm.Field>

                    {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

                    <otpForm.Subscribe selector={(state) => state.isSubmitting}>
                      {(isSubmitting) => (
                        <button
                          id="login-otp-submit"
                          type="submit"
                          className="btn btn-primary btn-block"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Verifying…" : "Verify & Sign In"}
                        </button>
                      )}
                    </otpForm.Subscribe>
                  </>
                )}
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  passwordForm.handleSubmit()
                }}
              >
                <passwordForm.Field name="identifier">
                  {(field) => (
                    <div className="input-group mb-3">
                      <input
                        id="login-identifier"
                        type="text"
                        className="form-control"
                        placeholder="Email or phone number"
                        autoComplete="username"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      <div className="input-group-append">
                        <div className="input-group-text">
                          <i className="fas fa-user" />
                        </div>
                      </div>
                      {field.state.meta.errors.length > 0 ? (
                        <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                      ) : null}
                    </div>
                  )}
                </passwordForm.Field>

                <passwordForm.Field name="password">
                  {(field) => <PasswordField id="login-password" placeholder="Password" field={field} />}
                </passwordForm.Field>

                {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

                <passwordForm.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <button
                      id="login-password-submit"
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing in…" : "Sign In"}
                    </button>
                  )}
                </passwordForm.Subscribe>
              </form>
            )}

            <p className="text-center mt-3 mb-0">
              Don&apos;t have an account? <Link to={ROUTES.AUTH.REGISTER}>Create one</Link>
            </p>
            <p className="text-center mt-2 mb-0">
              <Link id="login-back-to-home" to={ROUTES.STORE.HOME}>Back to Homepage</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
