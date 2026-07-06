import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { categorySchema } from "@/features/catalog/catalog.schema"

export function CategoryFormModal({ open, category, divisions, onClose, onSubmit, isSubmitting, serverError }) {
  const form = useForm({
    defaultValues: {
      divisionId: category?.divisionId ?? "",
      name: category?.name ?? "",
      isActive: category ? Boolean(category.isActive) : true,
    },
    validators: { onSubmit: categorySchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title={category ? "Edit Category" : "Add Category"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="category-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="divisionId">
          {(field) => (
            <div className="form-group">
              <label htmlFor="category-division">Division</label>
              <select
                id="category-division"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              >
                <option value="">Select a division…</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
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
              <label htmlFor="category-name">Name</label>
              <input
                id="category-name"
                className="form-control"
                placeholder="e.g. Topwear"
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
                id="category-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="category-active">
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
