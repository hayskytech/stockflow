import { useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { completeProfileSchema } from "@/features/auth/auth.schema"
import { PasswordField } from "@/components/ui/PasswordField"
import { PasswordRequirements } from "@/components/ui/PasswordRequirements"
import { useCompleteProfile } from "@/features/auth/hooks/use-complete-profile"
import { useAuthStore } from "@/store/auth.store"
import { apiErrorMessage } from "@/lib/errors"
import { ROUTES } from "@/constants/routes"

/**
 * Collects everything an account created by OTP login does not yet have. Signing in with a code
 * mints an account from a verified phone number alone, so this is where the customer becomes
 * someone we can actually ship to — and it is the only route to a complete profile for them,
 * since they never went through the registration form.
 *
 * Skippable on purpose: they are already signed in and free to browse. Checkout is where an
 * incomplete profile actually stops (see CheckoutPage), because that is the first thing that
 * genuinely needs a name and an address.
 */
export function CompleteProfilePage() {
  const [serverError, setServerError] = useState("")
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const completeProfile = useCompleteProfile()
  const navigate = useNavigate()
  const location = useLocation()

  // Whatever sent them here (checkout, usually) is where they belong once the profile is saved.
  const destination = location.state?.from ?? ROUTES.STORE.HOME

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      businessName: "",
      address: "",
      town: "",
      district: "",
      state: "",
      pincode: "",
      password: "",
    },
    validators: { onSubmit: completeProfileSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const saved = await completeProfile.mutateAsync(value)
        setUser({ ...user, name: saved.name, email: saved.email, profileComplete: true })
        navigate(destination, { replace: true })
      } catch (err) {
        setServerError(apiErrorMessage(err, "Could not save your profile"))
      }
    },
  })

  // Nothing to complete — including the moment right after a successful save, which lands on the
  // same destination the submit handler navigates to, so the two can never disagree.
  if (user?.profileComplete) {
    return <Navigate to={destination} replace />
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card">
          <div className="card-body">
            <h1 className="h4 mb-1">Complete your profile</h1>
            <p className="text-muted">
              Your phone number is verified and you are signed in. We just need a few details before
              you can place an order.
            </p>
            <div className="zari-rule zari-rule--sm mb-4" aria-hidden="true" />

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
                      <div className="form-group">
                        <label htmlFor="complete-profile-name">Full name</label>
                        <input
                          id="complete-profile-name"
                          type="text"
                          className="form-control"
                          autoFocus
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="col-md-6">
                  <form.Field name="email">
                    {(field) => (
                      <div className="form-group">
                        <label htmlFor="complete-profile-email">Email</label>
                        <input
                          id="complete-profile-email"
                          type="email"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
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
                      <div className="form-group">
                        <label htmlFor="complete-profile-address">Address</label>
                        <input
                          id="complete-profile-address"
                          type="text"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="col-md-6">
                  <form.Field name="town">
                    {(field) => (
                      <div className="form-group">
                        <label htmlFor="complete-profile-town">Town</label>
                        <input
                          id="complete-profile-town"
                          type="text"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
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
                      <div className="form-group">
                        <label htmlFor="complete-profile-district">District</label>
                        <input
                          id="complete-profile-district"
                          type="text"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="col-md-6">
                  <form.Field name="state">
                    {(field) => (
                      <div className="form-group">
                        <label htmlFor="complete-profile-state">State</label>
                        <input
                          id="complete-profile-state"
                          type="text"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
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
                      <div className="form-group">
                        <label htmlFor="complete-profile-pincode">Pincode</label>
                        <input
                          id="complete-profile-pincode"
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          maxLength={6}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="col-md-6">
                  <form.Field name="businessName">
                    {(field) => (
                      <div className="form-group">
                        <label htmlFor="complete-profile-business-name">
                          Business name <span className="text-muted">(optional)</span>
                        </label>
                        <input
                          id="complete-profile-business-name"
                          type="text"
                          className="form-control"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors.length > 0 ? (
                          <div className="invalid-feedback d-block">
                            {field.state.meta.errors[0]?.message}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Optional by design: this account signs in with a code, so a password is a
                  convenience, not a requirement. */}
              <div className="form-group">
                <label htmlFor="complete-profile-password">
                  Set a password <span className="text-muted">(optional)</span>
                </label>
                <form.Field name="password">
                  {(field) => (
                    <>
                      <PasswordField
                        id="complete-profile-password"
                        placeholder="Leave blank to keep signing in with an OTP"
                        field={field}
                      />
                      {field.state.value ? <PasswordRequirements value={field.state.value} /> : null}
                    </>
                  )}
                </form.Field>
              </div>

              {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

              <div className="d-flex align-items-center justify-content-between">
                <Link id="complete-profile-skip" to={ROUTES.STORE.HOME} className="btn btn-link px-0">
                  Skip for now
                </Link>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <button
                      id="complete-profile-submit"
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving…" : "Save and continue"}
                    </button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
