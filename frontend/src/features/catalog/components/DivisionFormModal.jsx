import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { divisionSchema } from "@/features/catalog/catalog.schema"

export function DivisionFormModal({ open, division, onClose, onSubmit, isSubmitting, serverError }) {
  const form = useForm({
    defaultValues: { name: division?.name ?? "", isActive: division?.isActive ?? true },
    validators: { onSubmit: divisionSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title={division ? "Edit Division" : "Add Division"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="division-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="division-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="form-group">
              <label htmlFor="division-name">Name</label>
              <input
                id="division-name"
                className="form-control"
                placeholder="e.g. KIDS WEAR"
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

        <form.Field name="isActive">
          {(field) => (
            <div className="form-group form-check">
              <input
                id="division-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="division-active">
                Active
              </label>
            </div>
          )}
        </form.Field>

        {serverError ? <div className="alert alert-danger py-2 mb-0">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
