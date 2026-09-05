import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { createBusinessSchema, updateBusinessSchema } from "@/features/businesses/businesses.schema"

/**
 * Create / edit a business (super-admin). Create mode also shows the optional "first admin"
 * block — assign an admin to the new business by email (a brand-new email needs a name +
 * password, which the server enforces; `passwordError` carries that 400 back onto the field).
 */
export function BusinessFormModal({
  open,
  business,
  onClose,
  onSubmit,
  isSubmitting,
  serverError,
  passwordError,
}) {
  const isEdit = Boolean(business)

  const form = useForm({
    defaultValues: isEdit
      ? {
          name: business?.name ?? "",
          slug: business?.slug ?? "",
          isActive: business ? Boolean(business.is_active ?? business.isActive) : true,
        }
      : {
          name: "",
          slug: "",
          initialAdminEmail: "",
          initialAdminName: "",
          initialAdminPassword: "",
        },
    validators: { onSubmit: isEdit ? updateBusinessSchema : createBusinessSchema },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        onSubmit({
          name: value.name.trim(),
          slug: value.slug.trim() || undefined,
          isActive: value.isActive,
        })
        return
      }
      onSubmit({
        name: value.name.trim(),
        slug: value.slug.trim() || undefined,
        initialAdminEmail: value.initialAdminEmail.trim() || undefined,
        initialAdminName: value.initialAdminName.trim() || undefined,
        initialAdminPassword: value.initialAdminPassword || undefined,
      })
    },
  })

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit business" : "New business"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="business-form"
            id="business-form-submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="business-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="form-group">
              <label htmlFor="business-name">Business name</label>
              <input
                id="business-name"
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

        <form.Field name="slug">
          {(field) => (
            <div className="form-group">
              <label htmlFor="business-slug">Slug (optional)</label>
              <input
                id="business-slug"
                className="form-control"
                placeholder="auto-generated from the name if left blank"
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

        {isEdit ? (
          <form.Field name="isActive">
            {(field) => (
              <div className="form-group form-check">
                <input
                  id="business-active"
                  type="checkbox"
                  className="form-check-input"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="business-active">
                  Active
                </label>
              </div>
            )}
          </form.Field>
        ) : (
          <>
            <hr />
            <p className="text-muted small mb-2">
              Optionally assign the first admin now. Leave blank to add members later.
            </p>

            <form.Field name="initialAdminEmail">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="initial-admin-email">First admin email</label>
                  <input
                    id="initial-admin-email"
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

            <form.Field name="initialAdminName">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="initial-admin-name">First admin name (new users only)</label>
                  <input
                    id="initial-admin-name"
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

            <form.Field name="initialAdminPassword">
              {(field) => (
                <div className="form-group mb-0">
                  <label htmlFor="initial-admin-password">First admin password</label>
                  <input
                    id="initial-admin-password"
                    type="password"
                    className="form-control"
                    autoComplete="new-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <small className="form-text text-muted">
                    Required when the email is a new account. Share it with them out-of-band.
                  </small>
                  {field.state.meta.errors.length > 0 ? (
                    <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                  ) : null}
                  {passwordError ? <div className="invalid-feedback d-block">{passwordError}</div> : null}
                </div>
              )}
            </form.Field>
          </>
        )}

        {serverError ? <div className="alert alert-danger py-2 mb-0 mt-3">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
