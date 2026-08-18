import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { registerApi } from "@/features/auth/auth.api"
import { otpCodeSchema, registerSchema, requestOtpSchema } from "@/features/auth/auth.schema"
import { OtpCodeStep } from "@/features/auth/components/OtpCodeStep"
import { PasswordField } from "@/components/ui/PasswordField"
import { PasswordRequirements } from "@/components/ui/PasswordRequirements"
import { PhoneField } from "@/components/ui/PhoneField"
import { useOtpSender } from "@/features/auth/hooks/use-otp"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { apiErrorMessage } from "@/lib/errors"
import { API_ERROR_CODES } from "@/constants/api"
import { ROUTES, landingPathForRole } from "@/constants/routes"

/**
 * Verify the phone before asking for anything else: the account is only ever created for a number
 * the visitor has proven they hold, so collecting a full profile first would risk throwing all of
 * it away at the last step.
 */
const STEPS = { PHONE: "phone", CODE: "code", DETAILS: "details" }

const STEP_ORDER = [STEPS.PHONE, STEPS.CODE, STEPS.DETAILS]

const STEP_HEADINGS = {
  [STEPS.PHONE]: "Enter your phone number",
  [STEPS.CODE]: "Verify your phone number",
  [STEPS.DETAILS]: "Complete your profile",
}

export function RegisterPage() {
  const [step, setStep] = useState(STEPS.PHONE)
  const [codeError, setCodeError] = useState("")
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const siteTitle = useSiteTitle()
  const sender = useOtpSender("register")

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      otp: "",
      businessName: "",
      address: "",
      town: "",
      district: "",
      state: "",
      pincode: "",
      password: "",
    },
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const { user, accessToken } = await registerApi(value)
        setAuth(user, accessToken)
        navigate(landingPathForRole(user.role), { replace: true })
      } catch (err) {
        // The code is only judged here, when registration actually spends it — so a bad code has
        // to reopen the step that owns it rather than surface as an error on the profile form.
        if (err?.response?.data?.details?.code === API_ERROR_CODES.OTP_INVALID) {
          form.setFieldValue("otp", "")
          setCodeError(apiErrorMessage(err, "Incorrect or expired code. Request a new one."))
          setStep(STEPS.CODE)
          return
        }
        setServerError(apiErrorMessage(err, "Could not create your account"))
      }
    },
  })

  /** The submit button advances one step at a time and only creates the account on the last one. */
  async function submitStep(event) {
    event.preventDefault()
    setServerError("")

    if (step === STEPS.PHONE) {
      if (await sender.send(form.getFieldValue("phone"))) {
        setCodeError("")
        setStep(STEPS.CODE)
      }
      return
    }

    if (step === STEPS.CODE) {
      // Only the shape can be checked here: MSG91 alone knows whether the code is right, and
      // asking spends it — so the real verdict lands on the final submit.
      const parsed = otpCodeSchema.safeParse({ otp: form.getFieldValue("otp") })
      if (!parsed.success) {
        setCodeError(parsed.error.issues[0]?.message ?? "Enter the code sent to your phone")
        return
      }
      setCodeError("")
      setStep(STEPS.DETAILS)
      return
    }

    form.handleSubmit()
  }

  /** Going back invalidates whatever was typed — a code only ever belongs to one number. */
  function backToPhoneStep() {
    setCodeError("")
    setServerError("")
    form.setFieldValue("otp", "")
    setStep(STEPS.PHONE)
  }

  return (
    <div className="register-page storefront">
      <div className="register-box">
        <div className="register-logo">
          <Link to={ROUTES.STORE.HOME}>
            <b>{siteTitle}</b>
          </Link>
        </div>
        <div className="zari-rule zari-rule--sm auth-box-rule" aria-hidden="true" />

        <div className="card">
          <div className="card-body register-card-body">
            <p className="login-box-msg mb-1">Create your account</p>

            <p id="register-step-indicator" className="text-center text-muted small mb-3">
              Step {STEP_ORDER.indexOf(step) + 1} of {STEP_ORDER.length} — {STEP_HEADINGS[step]}
            </p>

            <form onSubmit={submitStep}>
              {step === STEPS.PHONE ? (
                <>
                  <form.Field name="phone">
                    {(field) => (
                      <div className="mb-3">
                        <PhoneField id="register-phone" field={field} />
                      </div>
                    )}
                  </form.Field>

                  {sender.error ? <div className="alert alert-danger py-2">{sender.error}</div> : null}

                  <form.Subscribe selector={(state) => state.values.phone}>
                    {(phone) => (
                      <button
                        id="register-otp-send"
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={!requestOtpSchema.safeParse({ phone }).success || sender.isPending}
                      >
                        {sender.isPending ? "Sending…" : "Send Code"}
                      </button>
                    )}
                  </form.Subscribe>
                </>
              ) : null}

              {step === STEPS.CODE ? (
                <>
                  <form.Field name="otp">
                    {(field) => (
                      <OtpCodeStep
                        id="register-otp"
                        field={field}
                        sender={sender}
                        error={codeError}
                        onChangePhone={backToPhoneStep}
                      />
                    )}
                  </form.Field>

                  <button id="register-otp-continue" type="submit" className="btn btn-primary btn-block">
                    Continue
                  </button>
                </>
              ) : null}

              {step === STEPS.DETAILS ? (
                <>
                  <div className="row">
                    <div className="col-md-6">
                      <form.Field name="name">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-name"
                              type="text"
                              className="form-control"
                              placeholder="Full name"
                              autoFocus
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
                      </form.Field>
                    </div>

                    <div className="col-md-6">
                      <form.Field name="email">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-email"
                              type="email"
                              className="form-control"
                              placeholder="Email"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-envelope" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <form.Field name="address">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-address"
                              type="text"
                              className="form-control"
                              placeholder="Address"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-map-marker-alt" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>

                    <div className="col-md-6">
                      <form.Field name="town">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-town"
                              type="text"
                              className="form-control"
                              placeholder="Town"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-city" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <form.Field name="district">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-district"
                              type="text"
                              className="form-control"
                              placeholder="District"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-map" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>

                    <div className="col-md-6">
                      <form.Field name="state">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-state"
                              type="text"
                              className="form-control"
                              placeholder="State"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-flag" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <form.Field name="pincode">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-pincode"
                              type="text"
                              inputMode="numeric"
                              className="form-control"
                              placeholder="Pincode"
                              maxLength={6}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-mail-bulk" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>

                    <div className="col-md-6">
                      <form.Field name="businessName">
                        {(field) => (
                          <div className="input-group mb-3">
                            <input
                              id="register-business-name"
                              type="text"
                              className="form-control"
                              placeholder="Business name (optional)"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            <div className="input-group-append">
                              <div className="input-group-text">
                                <i className="fas fa-store" />
                              </div>
                            </div>
                            {field.state.meta.errors.length > 0 ? (
                              <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                            ) : null}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>

                  <form.Field name="password">
                    {(field) => (
                      <>
                        <PasswordField id="register-password" placeholder="Password" field={field} />
                        <PasswordRequirements value={field.state.value} />
                      </>
                    )}
                  </form.Field>

                  {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                      <button
                        id="register-submit"
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating account…" : "Register"}
                      </button>
                    )}
                  </form.Subscribe>

                  <p className="text-center mt-2 mb-0">
                    <button
                      id="register-back-to-code"
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={() => setStep(STEPS.CODE)}
                    >
                      Back
                    </button>
                  </p>
                </>
              ) : null}
            </form>

            <p className="text-center mt-3 mb-0">
              Already have an account? <Link to={ROUTES.AUTH.LOGIN}>Sign in</Link>
            </p>
            <p className="text-center mt-2 mb-0">
              <Link id="register-back-to-home" to={ROUTES.STORE.HOME}>Back to Homepage</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
