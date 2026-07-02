import { useState } from "react"
import { MediaLibraryModal } from "@/components/common/MediaLibraryModal"
import { resolveMediaUrl } from "@/lib/media"

/** Thumbnail + "Choose image" trigger that opens the shared media library modal. */
export function MediaPickerField({ label, imageUrl, onChange }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="d-flex align-items-center">
        <div className="border rounded mr-3 d-flex align-items-center justify-content-center" style={{ width: 80, height: 80, overflow: "hidden" }}>
          {imageUrl ? (
            <img src={resolveMediaUrl(imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <i className="fas fa-image text-muted" />
          )}
        </div>
        <div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setModalOpen(true)}>
            {imageUrl ? "Change image" : "Choose image"}
          </button>
          {imageUrl ? (
            <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => onChange(null)}>
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <MediaLibraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(media) => onChange(media)}
      />
    </div>
  )
}
