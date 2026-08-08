import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { changePasswordApi } from "@/features/auth/auth.api"
import { changePasswordSchema } from "@/features/auth/auth.schema"
import { PasswordField } from "@/features/auth/components/PasswordField"
import { PasswordRequirements } from "@/features/auth/components/PasswordRequirements"
import { useAuthStore } from "@/store/auth.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

export function ChangePasswordPage() {
  const [serverError, setServerError] = useState("")
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const siteTitle = useSiteTitle()

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        await changePasswordApi(value)
        navigate(user?.role === "customer" ? ROUTES.STORE.HOME : ROUTES.PROFILE, { replace: true })
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not change password")
      }
    },
  })

  return (
    <div className="login-page storefront">
      <div className="login-box">
        <div className="login-logo">
          <b>{siteTitle}</b>
        </div>
        <div className="zari-rule zari-rule--sm auth-box-rule" aria-hidden="true" />

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Change your password</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <form.Field name="currentPassword">
                {(field) => (
                  <PasswordField id="current-password" placeholder="Current password" field={field} />
                )}
              </form.Field>

              <form.Field name="newPassword">
                {(field) => (
                  <>
                    <PasswordField id="new-password" placeholder="New password" field={field} />
                    <PasswordRequirements value={field.state.value} />
                  </>
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
