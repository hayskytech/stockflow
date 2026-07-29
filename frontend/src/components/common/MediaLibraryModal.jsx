import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Modal } from "@/components/ui/Modal"
import { UppyUploader } from "@/components/common/UppyUploader"
import { EmptyState } from "@/components/common/EmptyState"
import { MEDIA_QUERY_KEY, useMediaList } from "@/features/media/hooks/use-media"
import { resolveMediaUrl } from "@/lib/media"

/**
 * Shared media picker — lets a feature either upload a new image or reuse an existing
 * one from the central library. `onSelect` receives the chosen media record (id, url, ...).
 */
export function MediaLibraryModal({ open, onClose, onSelect }) {
  const [tab, setTab] = useState("library")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useMediaList({ search, page, per_page: 24 })
  const items = data?.items ?? []

  function handleSelect(media) {
    onSelect(media)
    onClose()
  }

  // UppyUploader posts directly via XHR, bypassing the useMediaList/useMutation hooks —
  // so nothing else marks the cached media list stale. Without this, other already-mounted
  // (or later-mounted) pickers keep serving the pre-upload cached list.
  function handleUploaded(media) {
    queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] })
    handleSelect(media)
  }

  return (
    <Modal open={open} title="Media Library" onClose={onClose}>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "library" ? "active" : ""}`} onClick={() => setTab("library")}>
            Choose Existing
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>
            Upload New
          </button>
        </li>
      </ul>

      {tab === "upload" ? (
        <UppyUploader allowMultiple={false} onUploaded={handleUploaded} />
      ) : (
        <div>
          <input
            id="media-library-search"
            type="search"
            className="form-control mb-3"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : isError ? (
            <div className="alert alert-danger">Could not load the media library.</div>
          ) : items.length === 0 ? (
            <EmptyState icon="fa-images" title="No media yet" description="Upload an image to get started." />
          ) : (
            <div className="row" style={{ maxHeight: 400, overflowY: "auto" }}>
              {items.map((media) => (
                <div key={media.id} className="col-4 col-md-3 mb-3">
                  <button
                    type="button"
                    className="btn p-0 border w-100"
                    onClick={() => handleSelect(media)}
                    title={media.originalName ?? media.id}
                  >
                    <img src={resolveMediaUrl(media.url)} alt={media.originalName ?? ""} className="img-fluid" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {data && data.totalPages > 1 ? (
            <nav className="d-flex justify-content-end mt-3">
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
      )}
    </Modal>
  )
}
