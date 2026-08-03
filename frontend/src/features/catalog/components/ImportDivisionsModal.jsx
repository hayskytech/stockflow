import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { bulkImportDivisionsSchema } from "@/features/catalog/catalog.schema"
import { useBulkImportDivisions } from "@/features/catalog/hooks/use-divisions"

/** Bulk-add divisions from a textarea, one name per line. Duplicates (existing or repeated in the list) are skipped, not rejected. */
export function ImportDivisionsModal({ open, onClose }) {
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState("")
  const bulkImportDivisions = useBulkImportDivisions()

  const form = useForm({
    defaultValues: { namesText: "" },
    validators: { onSubmit: bulkImportDivisionsSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      const names = value.namesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      try {
        const data = await bulkImportDivisions.mutateAsync(names)
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
        if (e.target === e.currentTarget && !bulkImportDivisions.isPending) handleClose()
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Divisions</h5>
            <button type="button" className="close" onClick={handleClose} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {result ? (
              <div id="divisions-import-result">
                <div className="alert alert-success">
                  Created {result.created.length} division{result.created.length === 1 ? "" : "s"}.
                </div>
                {result.created.length > 0 ? (
                  <ul className="mb-3">
                    {result.created.map((d) => (
                      <li key={d.id}>{d.name}</li>
                    ))}
                  </ul>
                ) : null}
                {result.skipped.length > 0 ? (
                  <div className="alert alert-warning py-2">
                    <div className="mb-1">Skipped:</div>
                    <ul className="mb-0 pl-3">
                      {result.skipped.map((item, i) => (
                        <li key={i}>
                          {item.name} — {item.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <form
                id="divisions-import-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <p className="text-muted">Enter one division name per line.</p>
                <form.Field name="namesText">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="divisions-import-textarea">Division names</label>
                      <textarea
                        id="divisions-import-textarea"
                        className="form-control"
                        rows={8}
                        placeholder={"KIDS WEAR\nMENS WEAR\nLADIES WEAR"}
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
                {serverError ? <div className="alert alert-danger py-2 mb-0">{serverError}</div> : null}
              </form>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" id="divisions-import-close-btn" className="btn btn-secondary" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </button>
            {result ? null : (
              <button
                type="submit"
                form="divisions-import-form"
                id="divisions-import-submit-btn"
                className="btn btn-primary"
                disabled={bulkImportDivisions.isPending}
              >
                {bulkImportDivisions.isPending ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
