import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { addMemberSchema } from "@/features/members/members.schema"

/**
 * "Add member" form. Adds a user to the current business by email:
 *  - an existing user just gets a membership;
 *  - a brand-new email needs `name` + `password` (the backend enforces the password, and
 *    `passwordError` carries that 400 back onto the field).
 */
export function AddMemberModal({ open, onClose, onSubmit, isSubmitting, serverError, passwordError }) {
  const form = useForm({
    defaultValues: { email: "", role: "staff", name: "", password: "" },
    validators: { onSubmit: addMemberSchema },
    onSubmit: async ({ value }) => {
      onSubmit({
        email: value.email.trim(),
        role: value.role,
        name: value.name.trim() || undefined,
        password: value.password ? value.password : undefined,
      })
    },
  })

  return (
    <Modal
      open={open}
      title="Add member"
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-member-form"
            id="add-member-submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding…" : "Add member"}
          </button>
        </>
      }
    >
      <form
        id="add-member-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="form-group">
              <label htmlFor="member-email">Email</label>
              <input
                id="member-email"
                type="email"
                className="form-control"
                placeholder="person@example.com"
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
              <label htmlFor="member-role">Role</label>
              <select
                id="member-role"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => (
            <div className="form-group">
              <label htmlFor="member-name">Name (new users only)</label>
              <input
                id="member-name"
                type="text"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="form-group mb-0">
              <label htmlFor="member-password">Password (new users only)</label>
              <input
                id="member-password"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <small className="form-text text-muted">
                Only needed when the email doesn&apos;t already have an account. Share it with them
                out-of-band.
              </small>
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
              {passwordError ? <div className="invalid-feedback d-block">{passwordError}</div> : null}
            </div>
          )}
        </form.Field>

        {serverError ? <div className="alert alert-danger py-2 mb-0 mt-3">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
