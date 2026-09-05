import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { loginApi } from "@/features/auth/auth.api"
import { loginSchema } from "@/features/auth/auth.schema"
import { PasswordField } from "@/components/ui/PasswordField"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-business-settings"
import { apiErrorMessage } from "@/lib/errors"
import { ROUTES } from "@/constants/routes"

// The OTP / phone sign-in mode is unmounted — storefront & customer login on hold, see
// multitenant_plan.md Phase 1. hooks/use-otp.js and components/OtpCodeStep.jsx stay on disk, unused.
export function LoginPage() {
  const [serverError, setServerError] = useState("")
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const siteTitle = useSiteTitle()

  function completeLogin({ user, accessToken }) {
    setAuth(user, accessToken)
    // Drop any cached data from a previous session, then let RootRedirect pick the landing target.
    queryClient.clear()
    navigate("/", { replace: true })
  }

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

  return (
    <div className="login-page storefront">
      <div className="login-box">
        <div className="login-logo">
          <Link to={ROUTES.AUTH.LOGIN}>
            <b>{siteTitle}</b>
          </Link>
        </div>
        <div className="zari-rule zari-rule--sm auth-box-rule" aria-hidden="true" />

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Sign in to continue</p>

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
          </div>
        </div>
      </div>
    </div>
  )
}
