import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { UppyUploader } from "@/components/common/UppyUploader"
import { useMediaList, useDeleteMedia } from "@/features/media/hooks/use-media"
import { useMediaStore } from "@/features/media/media.store"

export function MediaLibraryPage() {
  const { search, setSearch, page, setPage } = useMediaStore()
  const [unusedOnly, setUnusedOnly] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deleteError, setDeleteError] = useState("")

  const { data, isLoading, isError } = useMediaList({ search, page, per_page: 24, unused_only: unusedOnly })
  const deleteMedia = useDeleteMedia()
  const items = data?.items ?? []

  async function handleConfirmDelete() {
    setDeleteError("")
    try {
      await deleteMedia.mutateAsync(pendingDeleteId)
      setPendingDeleteId(null)
    } catch (err) {
      setDeleteError(err.response?.data?.message ?? "Could not delete this media item")
    }
  }

  return (
    <PageWrapper>
      <PageHeader title="Media Library" description="Images uploaded across StockFlow — reuse them or remove what's no longer needed" />

      <div className="card mb-3">
        <div className="card-body">
          <UppyUploader onUploaded={() => setPage(1)} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <input
              id="media-search"
              type="search"
              className="form-control w-auto"
              style={{ minWidth: 260 }}
              placeholder="Search by filename…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <div className="form-check">
              <input
                id="media-unused-only"
                type="checkbox"
                className="form-check-input"
                checked={unusedOnly}
                onChange={(e) => {
                  setUnusedOnly(e.target.checked)
                  setPage(1)
                }}
              />
              <label className="form-check-label" htmlFor="media-unused-only">
                Show unused only
              </label>
            </div>
          </div>

          {deleteError ? <div className="alert alert-danger">{deleteError}</div> : null}

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : isError ? (
            <div className="alert alert-danger">Could not load the media library.</div>
          ) : items.length === 0 ? (
            <EmptyState icon="fa-images" title="No media found" />
          ) : (
            <div className="row">
              {items.map((media) => (
                <div key={media.id} className="col-6 col-md-3 col-lg-2 mb-4">
                  <div className="card h-100">
                    <img src={media.url} alt={media.originalName ?? ""} className="card-img-top" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                    <div className="card-body p-2">
                      <p className="small text-muted mb-1 text-truncate" title={media.originalName ?? ""}>
                        {media.originalName ?? "Untitled"}
                      </p>
                      <p className="small text-muted mb-2">{Math.round(media.sizeBytes / 1024)} KB</p>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm btn-block"
                        onClick={() => setPendingDeleteId(media.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.totalPages > 1 ? (
            <nav className="d-flex justify-content-end">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button type="button" className="page-link" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                    Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">
                    Page {page} of {data.totalPages}
                  </span>
                </li>
                <li className={`page-item ${page >= data.totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete media item?"
        message="This permanently removes the file. It can't be undone, and it's blocked if anything still uses it."
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </PageWrapper>
  )
}
