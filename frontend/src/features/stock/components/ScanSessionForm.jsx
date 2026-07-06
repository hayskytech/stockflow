import { useForm } from "@tanstack/react-form"
import { scanSessionSchema } from "@/features/stock/stock.schema"

/**
 * Scan-batch header form — product + supplier invoice + per-unit defaults. Submitting
 * locks these values for the scanning phase; MRP/WSP prefill from the selected product
 * (they're per-unit columns on stock, products only carry defaults).
 */
export function ScanSessionForm({ products, initial, onSubmit, onCancel }) {
  const form = useForm({
    defaultValues: {
      productId: initial?.productId ?? "",
      invoiceNo: initial?.invoiceNo ?? "",
      invoiceDate: initial?.invoiceDate ?? "",
      mrp: initial?.mrp ?? "",
      wsp: initial?.wsp ?? "",
      size: initial?.size ?? "",
      note: initial?.note ?? "",
    },
    validators: { onSubmit: scanSessionSchema },
    onSubmit: ({ value }) => {
      const product = products.find((p) => p.id === value.productId)
      onSubmit({ ...value, productName: product?.name ?? "" })
    },
  })

  function renderError(field) {
    return field.state.meta.errors.length > 0 ? (
      <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
    ) : null
  }

  return (
    <form
      id="scan-session-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="row">
        <div className="col-md-6">
          <form.Field name="productId">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-product-select">Product</label>
                <select
                  id="scan-product-select"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    const product = products.find((p) => p.id === e.target.value)
                    if (product) {
                      form.setFieldValue("mrp", product.mrp ?? "")
                      form.setFieldValue("wsp", product.wsp ?? "")
                    }
                  }}
                >
                  <option value="">Select a product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.productCode})
                    </option>
                  ))}
                </select>
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="invoiceNo">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-invoice-no">Invoice No</label>
                <input
                  id="scan-invoice-no"
                  type="text"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="invoiceDate">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-invoice-date">Invoice Date</label>
                <input
                  id="scan-invoice-date"
                  type="date"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="row">
        <div className="col-md-3">
          <form.Field name="mrp">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-mrp">MRP (per unit)</label>
                <input
                  id="scan-mrp"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="wsp">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-wsp">WSP (per unit)</label>
                <input
                  id="scan-wsp"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-2">
          <form.Field name="size">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-size">Size</label>
                <input
                  id="scan-size"
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-4">
          <form.Field name="note">
            {(field) => (
              <div className="form-group">
                <label htmlFor="scan-note">Note</label>
                <input
                  id="scan-note"
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {renderError(field)}
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="d-flex">
        <button type="submit" id="scan-session-submit" className="btn btn-primary">
          {initial ? "Update details" : "Start scanning"}
        </button>
        {onCancel ? (
          <button type="button" id="scan-session-cancel" className="btn btn-secondary ml-2" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
