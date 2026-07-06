import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { EmptyState } from "@/components/common/EmptyState"
import { useDeleteAllData } from "@/features/settings/hooks/use-settings"

const DELETED_LABELS = {
  products: "Products",
  orders: "Orders",
  stock: "Stock units",
  stockLedger: "Stock ledger entries",
  media: "Media uploads",
  users: "Users",
}

export function SettingsPage() {
  const isDev = import.meta.env.DEV

  const [confirmText, setConfirmText] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState("")

  const deleteAllData = useDeleteAllData()

  async function handleDelete() {
    setConfirmOpen(false)
    setServerError("")
    setResult(null)
    try {
      const data = await deleteAllData.mutateAsync()
      setResult(data.deleted)
      setConfirmText("")
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Delete failed — nothing may have been removed")
    }
  }

  return (
    <PageWrapper>
      <PageHeader title="Settings" description="System administration" />

      {isDev ? (
        <div className="card border-danger">
          <div className="card-header bg-danger">
            <i className="fas fa-exclamation-triangle mr-1" />
            Danger Zone — development only
          </div>
          <div className="card-body">
            <p>
              <strong>Delete All Data</strong> removes every product, order, stock unit, stock ledger entry,
              media upload (including files on disk) and all users except the seeded admin/staff accounts.
              Warehouse settings and the catalog (divisions, categories, sub-categories) are kept.
              This cannot be undone.
            </p>

            {result ? (
              <div className="alert alert-success" id="settings-delete-result">
                <strong>All data deleted.</strong>
                <ul className="mb-0 mt-2">
                  {Object.entries(DELETED_LABELS).map(([key, label]) => (
                    <li key={key}>
                      {label}: {result[key] ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {serverError ? (
              <div className="alert alert-danger py-2" id="settings-delete-error">
                {serverError}
              </div>
            ) : null}

            <div className="form-group">
              <label htmlFor="settings-delete-confirm-input">
                Type <strong>DELETE</strong> to enable the button
              </label>
              <input
                id="settings-delete-confirm-input"
                type="text"
                className="form-control"
                style={{ maxWidth: "16rem" }}
                value={confirmText}
                autoComplete="off"
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <button
              type="button"
              id="settings-delete-all-button"
              className="btn btn-danger"
              disabled={confirmText !== "DELETE" || deleteAllData.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {deleteAllData.isPending ? (
                "Deleting…"
              ) : (
                <>
                  <i className="fas fa-trash mr-1" />
                  Delete All Data
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <EmptyState icon="fa-cog" title="No settings available" />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete all data?"
        message="This permanently deletes all products, orders, stock, ledger entries, media files and non-seed users. There is no way to undo this."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageWrapper>
  )
}
