import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { registerApi } from "@/features/auth/auth.api"
import { registerSchema } from "@/features/auth/auth.schema"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME, APP_TAGLINE } from "@/constants/app"
import { ROUTES, landingPathForRole } from "@/constants/routes"

export function RegisterPage() {
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
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

              <form.Field name="password">
                {(field) => (
                  <div className="input-group mb-3">
                    <input
                      id="register-password"
                      type="password"
                      className="form-control"
                      placeholder="Password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <div className="input-group-append">
                      <div className="input-group-text">
                        <i className="fas fa-lock" />
                      </div>
                    </div>
                    {field.state.meta.errors.length > 0 ? (
                      <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="confirmPassword">
                {(field) => (
                  <div className="input-group mb-3">
                    <input
                      id="register-confirm-password"
                      type="password"
                      className="form-control"
                      placeholder="Confirm password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <div className="input-group-append">
                      <div className="input-group-text">
                        <i className="fas fa-lock" />
                      </div>
                    </div>
                    {field.state.meta.errors.length > 0 ? (
                      <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                    ) : null}
                  </div>
                )}
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
