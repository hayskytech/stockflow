import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { registerApi } from "@/features/auth/auth.api"
import { registerSchema } from "@/features/auth/auth.schema"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME, APP_TAGLINE } from "@/constants/app"
import { ROUTES, landingPathForRole } from "@/constants/routes"

export function RegisterPage() {
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
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
        setServerError(
          err.response
            ? (err.response.data?.message ?? "Could not create your account")
            : "Could not reach the server. Please check your connection and try again."
        )
      }
    },
  })

  return (
    <div className="register-page">
      <div className="register-box">
        <div className="register-logo">
          <b>{APP_NAME}</b>
        </div>
        <p className="text-center text-muted">{APP_TAGLINE}</p>

        <div className="card">
          <div className="card-body register-card-body">
            <p className="login-box-msg">Create your account</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
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
                  <form.Field name="phone">
                    {(field) => (
                      <div className="input-group mb-3">
                        <input
                          id="register-phone"
                          type="tel"
                          className="form-control"
                          placeholder="Phone"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <div className="input-group-append">
                          <div className="input-group-text">
                            <i className="fas fa-phone" />
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

              <form.Field name="pincode">
                {(field) => (
                  <div className="input-group mb-3">
                    <input
                      id="register-pincode"
                      type="text"
                      className="form-control"
                      placeholder="Pincode"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
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

              <form.Field name="password">
                {(field) => <PasswordField id="register-password" placeholder="Password" field={field} />}
              </form.Field>

              {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account…" : "Register"}
                  </button>
                )}
              </form.Subscribe>
            </form>

            <p className="text-center mt-3 mb-0">
              Already have an account? <Link to={ROUTES.AUTH.LOGIN}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
