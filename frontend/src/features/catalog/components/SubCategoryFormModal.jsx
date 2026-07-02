import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { subCategorySchema } from "@/features/catalog/catalog.schema"

export function SubCategoryFormModal({ open, subCategory, categories, onClose, onSubmit, isSubmitting, serverError }) {
  const form = useForm({
    defaultValues: {
      categoryId: subCategory?.categoryId ?? "",
      name: subCategory?.name ?? "",
      isActive: subCategory ? Boolean(subCategory.isActive) : true,
    },
    validators: { onSubmit: subCategorySchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title={subCategory ? "Edit Sub-category" : "Add Sub-category"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="sub-category-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="sub-category-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="categoryId">
          {(field) => (
            <div className="form-group">
              <label htmlFor="sub-category-category">Category</label>
              <select
                id="sub-category-category"
                className="form-control"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              >
                <option value="">Select a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
              <label htmlFor="sub-category-name">Name</label>
              <input
                id="sub-category-name"
                className="form-control"
                placeholder="e.g. Casual Shirts"
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
                id="sub-category-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="sub-category-active">
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
