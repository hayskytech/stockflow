import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { UppyUploader } from "@/components/common/UppyUploader"
import { EmptyState } from "@/components/common/EmptyState"
import { useMediaList } from "@/features/media/hooks/use-media"

/**
 * Shared media picker — lets a feature either upload a new image or reuse an existing
 * one from the central library. `onSelect` receives the chosen media record (id, url, ...).
 */
export function MediaLibraryModal({ open, onClose, onSelect }) {
  const [tab, setTab] = useState("library")
  const [search, setSearch] = useState("")

  const { data, isLoading, isError } = useMediaList({ search, per_page: 24 })
  const items = data?.items ?? []

  function handleSelect(media) {
    onSelect(media)
    onClose()
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
        <UppyUploader allowMultiple={false} onUploaded={handleSelect} />
      ) : (
        <div>
          <input
            id="media-library-search"
            type="search"
            className="form-control mb-3"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    <img src={media.url} alt={media.originalName ?? ""} className="img-fluid" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
