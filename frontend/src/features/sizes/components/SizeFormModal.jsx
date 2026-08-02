import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { sizeSchema } from "@/features/sizes/sizes.schema"

export function SizeFormModal({ open, size, onClose, onSubmit, isSubmitting, serverError }) {
  const form = useForm({
    defaultValues: { value: size?.value ?? "", isActive: size ? Boolean(size.isActive) : true },
    validators: { onSubmit: sizeSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title={size ? "Edit Size" : "Add Size"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="size-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="size-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="value">
          {(field) => (
            <div className="form-group">
              <label htmlFor="size-value">Size</label>
              <input
                id="size-value"
                className="form-control"
                placeholder="e.g. S, M, L, 32…"
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
                id="size-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="size-active">
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
