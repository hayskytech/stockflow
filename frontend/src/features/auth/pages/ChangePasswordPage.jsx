import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { changePasswordApi } from "@/features/auth/auth.api"
import { changePasswordSchema } from "@/features/auth/auth.schema"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"

export function ChangePasswordPage() {
  const [serverError, setServerError] = useState("")
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        await changePasswordApi(value)
        clearMustChangePassword()
        navigate(ROUTES.DASHBOARD, { replace: true })
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not change password")
      }
    },
  })

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <b>{APP_NAME}</b>
        </div>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">You must set a new password before continuing</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <form.Field name="currentPassword">
                {(field) => (
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Current password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="newPassword">
                {(field) => (
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="New password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="confirmPassword">
                {(field) => (
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Confirm new password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
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
                    {isSubmitting ? "Saving…" : "Change Password"}
                  </button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
