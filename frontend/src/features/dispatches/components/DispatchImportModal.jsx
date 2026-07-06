import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { dispatchImportSchema } from "@/features/dispatches/dispatches.schema"
import { useImportDispatch } from "@/features/dispatches/hooks/use-dispatches"

/**
 * Upload modal for dispatching from a barcode file (.xlsx/.csv with a Barcode column)
 * instead of live scanning. Same all-or-nothing server rules as the scan flow.
 */
export function DispatchImportModal({ open, orderId, onClose, onImported }) {
  const [serverError, setServerError] = useState("")
  const [serverProblems, setServerProblems] = useState([])
  const importDispatch = useImportDispatch()

  const form = useForm({
    defaultValues: { file: null },
    validators: { onSubmit: dispatchImportSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setServerProblems([])
      try {
        const data = await importDispatch.mutateAsync({ orderId, file: value.file })
        form.reset()
        onImported(data)
      } catch (err) {
        const details = err.response?.data?.details
        if (Array.isArray(details) && details.length > 0) setServerProblems(details)
        else setServerError(err.response?.data?.message ?? "Import failed — nothing was dispatched")
      }
    },
  })

  function handleClose() {
    setServerError("")
    setServerProblems([])
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
        if (e.target === e.currentTarget && !importDispatch.isPending) handleClose()
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Dispatch from file</h5>
          </div>
          <div className="modal-body">
            <form
              id="dispatch-import-form"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <p className="text-muted">
                Upload a .xlsx/.csv with a <strong>Barcode</strong> column — one row per physical unit leaving the
                warehouse. The whole file is rejected if any barcode has a problem.
              </p>
              <form.Field name="file">
                {(field) => (
                  <div className="form-group">
                    <label htmlFor="dispatch-import-file">File</label>
                    <input
                      id="dispatch-import-file"
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
              {serverProblems.length > 0 ? (
                <div className="alert alert-danger py-2">
                  <strong>Dispatch rejected — nothing was saved:</strong>
                  <ul className="mb-0 pl-3">
                    {serverProblems.map((problem, index) => (
                      <li key={index}>{problem}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="dispatch-import-form"
              className="btn btn-primary"
              disabled={importDispatch.isPending}
            >
              {importDispatch.isPending ? "Dispatching…" : "Dispatch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
