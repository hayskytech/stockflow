import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { createUserSchema, editUserSchema } from "@/features/users/users.schema"
import { PasswordField } from "@/components/ui/PasswordField"
import { PasswordRequirements } from "@/components/ui/PasswordRequirements"
import { PhoneField } from "@/components/ui/PhoneField"
import { PincodeField } from "@/components/ui/PincodeField"
import { ROLES } from "@/constants/app"

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.STAFF, label: "Staff" },
  { value: ROLES.CUSTOMER, label: "Customer" },
]

const VALID_ROLES = ROLE_OPTIONS.map((option) => option.value)

// Guard against dirty data (e.g. a role stored as '' from a pre-migration DB):
// fall back to a real role so the select is never blank and Save can't silently
// fail enum validation.
function normalizeRole(role) {
  return VALID_ROLES.includes(role) ? role : ROLES.STAFF
}

export function UserFormModal({ open, user, onClose, onSubmit, isSubmitting, serverError }) {
  const isEdit = Boolean(user)

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: normalizeRole(user?.role),
      password: "",
      isActive: user ? Boolean(user.isActive) : true,
      isSuperAdmin: user ? Boolean(user.isSuperAdmin) : false,
      phone: user?.phone ?? "",
      businessName: user?.businessName ?? "",
      address: user?.address ?? "",
      town: user?.town ?? "",
      district: user?.district ?? "",
      state: user?.state ?? "",
      pincode: user?.pincode ?? "",
    },
    validators: { onSubmit: isEdit ? editUserSchema : createUserSchema },
    onSubmit: async ({ value }) => {
      const input = { ...value }
      // A blank password on edit means "keep the current one" — don't send it.
      if (isEdit && !input.password) delete input.password
      onSubmit(input)
    },
  })

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit User" : "Add User"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="user-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="form-group">
              <label htmlFor="user-name">Name</label>
              <input
                id="user-name"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <div className="form-group">
              <label htmlFor="user-email">Email</label>
              <input
                id="user-email"
                type="email"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <div className="form-group">
              <label htmlFor="user-role">Role</label>
              <select
                id="user-role"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <div className="form-row">
          <div className="form-group col-md-6">
            <form.Field name="phone">
              {(field) => (
                <>
                  <label htmlFor="user-phone">Phone</label>
                  <PhoneField id="user-phone" field={field} />
                </>
              )}
            </form.Field>
          </div>
          <div className="form-group col-md-6">
            <form.Field name="businessName">
              {(field) => (
                <>
                  <label htmlFor="user-business-name">Business name</label>
                  <input
                    id="user-business-name"
                    className="form-control"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                  ) : null}
                </>
              )}
            </form.Field>
          </div>
        </div>

        <form.Field name="address">
          {(field) => (
            <div className="form-group">
              <label htmlFor="user-address">Address</label>
              <input
                id="user-address"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <div className="form-row">
          <div className="form-group col-md-6">
            <form.Field name="town">
              {(field) => (
                <>
                  <label htmlFor="user-town">Town</label>
                  <input
                    id="user-town"
                    className="form-control"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </>
              )}
            </form.Field>
          </div>
          <div className="form-group col-md-6">
            <form.Field name="district">
              {(field) => (
                <>
                  <label htmlFor="user-district">District</label>
                  <input
                    id="user-district"
                    className="form-control"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </>
              )}
            </form.Field>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group col-md-6">
            <form.Field name="state">
              {(field) => (
                <>
                  <label htmlFor="user-state">State</label>
                  <input
                    id="user-state"
                    className="form-control"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </>
              )}
            </form.Field>
          </div>
          <div className="form-group col-md-6">
            <form.Field name="pincode">
              {(field) => (
                <>
                  <label htmlFor="user-pincode">Pincode</label>
                  <PincodeField id="user-pincode" field={field} />
                </>
              )}
            </form.Field>
          </div>
        </div>

        <form.Field name="password">
          {(field) => (
            <div className="form-group">
              <label htmlFor="user-password">{isEdit ? "Reset password (optional)" : "Password"}</label>
              <PasswordField
                id="user-password"
                placeholder={isEdit ? "Leave blank to keep current password" : ""}
                field={field}
              />
              {field.state.value ? <PasswordRequirements value={field.state.value} /> : null}
            </div>
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="form-group form-check">
              <input
                id="user-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="user-active">
                Active
              </label>
            </div>
          )}
        </form.Field>

        <form.Field name="isSuperAdmin">
          {(field) => (
            <div className="form-group form-check">
              <input
                id="user-super-admin"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="user-super-admin">
                Platform super admin
              </label>
              <small className="form-text text-muted">
                Full control of every business, the business directory, and this user list.
              </small>
            </div>
          )}
        </form.Field>

        {serverError ? <div className="alert alert-danger py-2 mb-0">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
