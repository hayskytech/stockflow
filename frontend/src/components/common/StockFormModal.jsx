import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { SearchSelect } from "@/components/ui/SearchSelect"
import { useSizeOptions } from "@/hooks/use-size-options"
import { createStockSchema } from "@/features/stock/stock.schema"

/** Add-stock modal — one intake batch against a product/invoice. */
export function StockFormModal({ open, products, initialProductId, onClose, onSubmit, isSubmitting, serverError }) {
  const { data: sizes = [] } = useSizeOptions()
  const form = useForm({
    defaultValues: {
      productId: initialProductId ?? "",
      quantity: "",
      invoiceNo: "",
      invoiceDate: "",
      price: "",
      discountPercent: "",
      size: "",
      note: "",
    },
    validators: { onSubmit: createStockSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title="Add Stock"
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="stock-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="stock-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="productId">
          {(field) => (
            <div className="form-group">
              <label htmlFor="stock-product">Product</label>
              <SearchSelect
                id="stock-product"
                placeholder="Search products…"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                options={products.map((product) => ({ value: product.id, label: product.name }))}
                disabled={Boolean(initialProductId)}
              />
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </div>
          )}
        </form.Field>

        <div className="row">
          <div className="col-md-6">
            <form.Field name="quantity">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-quantity">Quantity</label>
                  <input
                    id="stock-quantity"
                    type="number"
                    min="1"
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
          </div>
          <div className="col-md-6">
            <form.Field name="size">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-size">Size</label>
                  <select
                    id="stock-size"
                    className="form-control"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  >
                    <option value="">None</option>
                    {sizes.map((size) => (
                      <option key={size.id} value={size.value}>
                        {size.value}
                      </option>
                    ))}
                  </select>
                  {field.state.meta.errors.length > 0 ? (
                    <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <form.Field name="price">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-price">Price</label>
                  <input
                    id="stock-price"
                    type="number"
                    min="0"
                    step="0.01"
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
          </div>
          <div className="col-md-6">
            <form.Field name="discountPercent">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-discount-percent">Discount %</label>
                  <input
                    id="stock-discount-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
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
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <form.Field name="invoiceNo">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-invoice-no">Invoice number</label>
                  <input
                    id="stock-invoice-no"
                    type="text"
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
          </div>
          <div className="col-md-6">
            <form.Field name="invoiceDate">
              {(field) => (
                <div className="form-group">
                  <label htmlFor="stock-invoice-date">Invoice date</label>
                  <input
                    id="stock-invoice-date"
                    type="date"
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
          </div>
        </div>

        <form.Field name="note">
          {(field) => (
            <div className="form-group mb-0">
              <label htmlFor="stock-note">Note</label>
              <textarea
                id="stock-note"
                className="form-control"
                rows={2}
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

        {serverError ? <div className="alert alert-danger py-2 mt-3 mb-0">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
