import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { loginApi } from "@/features/auth/auth.api"
import { loginSchema } from "@/features/auth/auth.schema"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME, APP_TAGLINE } from "@/constants/app"
import { ROUTES, landingPathForRole } from "@/constants/routes"

export function LoginPage() {
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const { user, accessToken } = await loginApi(value)
        setAuth(user, accessToken)
        navigate(landingPathForRole(user.role), { replace: true })
      } catch (err) {
        setServerError(
          err.response ? (err.response.data?.message ?? "Invalid email or password") : "Could not reach the server. Please check your connection and try again."
        )
      }
    },
  })

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <b>{APP_NAME}</b>
        </div>
        <p className="text-center text-muted">{APP_TAGLINE}</p>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Sign in to continue</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <form.Field name="email">
                {(field) => (
                  <div className="input-group mb-3">
                    <input
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
                {(field) => <PasswordField id="login-password" placeholder="Password" field={field} />}
              </form.Field>

              {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in…" : "Sign In"}
                  </button>
                )}
              </form.Subscribe>
            </form>

            <p className="text-center mt-3 mb-0">
              Don&apos;t have an account? <Link to={ROUTES.AUTH.REGISTER}>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
