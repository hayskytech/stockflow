import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { productImportSchema } from "@/features/products/products.schema"
import { useImportProducts } from "@/features/products/hooks/use-products"

/** Upload modal for the one-time bulk product catalog import (.xlsx/.csv). */
export function ProductImportModal({ open, onClose }) {
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState("")
  const importProducts = useImportProducts()

  const form = useForm({
    defaultValues: { file: null },
    validators: { onSubmit: productImportSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const data = await importProducts.mutateAsync(value.file)
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
        if (e.target === e.currentTarget && !importProducts.isPending) handleClose()
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Products</h5>
          </div>
          <div className="modal-body">
            {result ? (
              <>
                <div className={`alert alert-success ${result.createdCategories?.length ? "" : "mb-0"}`}>
                  Imported {result.imported} product{result.imported === 1 ? "" : "s"}.
                </div>
                {result.createdCategories?.length > 0 ? (
                  <div className="alert alert-info mb-0" id="product-import-created-categories">
                    Created {result.createdCategories.length} new{" "}
                    {result.createdCategories.length === 1 ? "category" : "categories"} under the GENERAL
                    division: {result.createdCategories.join(", ")}
                  </div>
                ) : null}
              </>
            ) : (
              <form
                id="product-import-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <p className="text-muted">
                  Upload the product catalog excel/CSV (columns: SubGroupName, Product Code, Product Name).
                  SubGroupName becomes the product&apos;s category — categories that don&apos;t exist yet are
                  created automatically under the GENERAL division.
                </p>
                <form.Field name="file">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="product-import-file">File</label>
                      <input
                        id="product-import-file"
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
                form="product-import-form"
                className="btn btn-primary"
                disabled={importProducts.isPending}
              >
                {importProducts.isPending ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
