import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { stockImportSchema } from "@/features/stock/stock.schema"
import { useDownloadStockImportTemplate, useImportStock } from "@/features/stock/hooks/use-stock"

/** Upload modal for bulk stock import (.xlsx/.csv) — see stock.schema.js for accepted files. */
export function StockImportModal({ open, onClose }) {
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState("")
  const importStock = useImportStock()
  const downloadTemplate = useDownloadStockImportTemplate()

  const form = useForm({
    defaultValues: { file: null },
    validators: { onSubmit: stockImportSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const data = await importStock.mutateAsync(value.file)
        setResult(data)
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Import failed")
      }
    },
  })

  function handleClose() {
    setResult(null)
    setServerError("")
    form.reset()
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      style={{ background: "rgba(0,0,0,0.5)", overflowY: "auto" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !importStock.isPending) handleClose()
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Stock</h5>
          </div>
          <div className="modal-body">
            {result ? (
              <div>
                <div className="alert alert-success">
                  Imported {result.imported} stock item{result.imported === 1 ? "" : "s"}.
                </div>
                {result.byProduct?.length > 0 ? (
                  <ul className="mb-3">
                    {result.byProduct.map((p) => (
                      <li key={p.productId}>
                        {p.name} — {p.count} unit{p.count === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {result.warnings?.length > 0 ? (
                  <div className="alert alert-warning py-2">
                    {result.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <form
                id="stock-import-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <p className="text-muted">
                  Upload the stock excel/CSV exported from your inventory software (columns: Product,
                  ProductSubGroup, Price, InvoiceNo, DiscountPercent, Quantity, InvoiceDate, Size, Note).
                </p>
                <button
                  type="button"
                  id="stock-import-download-template"
                  className="btn btn-link p-0 mb-3"
                  disabled={downloadTemplate.isPending}
                  onClick={() => downloadTemplate.mutate()}
                >
                  {downloadTemplate.isPending ? "Preparing…" : "Download blank template"}
                </button>
                <form.Field name="file">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="stock-import-file">File</label>
                      <input
                        id="stock-import-file"
                        type="file"
                        className="form-control-file"
                        accept=".xlsx,.csv"
                        onChange={(e) => field.handleChange(e.target.files?.[0] ?? null)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}
              </form>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </button>
            {result ? null : (
              <button
                type="submit"
                form="stock-import-form"
                className="btn btn-primary"
                disabled={importStock.isPending}
              >
                {importStock.isPending ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
