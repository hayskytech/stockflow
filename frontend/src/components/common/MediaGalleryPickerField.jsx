import { useState } from "react"
import { MediaLibraryModal } from "@/components/common/MediaLibraryModal"
import { resolveMediaUrl } from "@/lib/media"
import { MEDIA } from "@/constants/app"

const SUPPORTED_FORMATS_LABEL = MEDIA.ALLOWED_MIME_TYPES.map((type) => type.split("/")[1].toUpperCase()).join(", ")

/** Multi-image picker (up to `max`) built on the shared media library modal — mirrors MediaPickerField for a set of images. */
export function MediaGalleryPickerField({ label, images, onChange, max = 5 }) {
  const [modalOpen, setModalOpen] = useState(false)

  function handleSelect(media) {
    if (images.some((img) => img.mediaId === media.id)) return
    onChange([...images, { mediaId: media.id, url: media.url }])
  }

  function handleRemove(mediaId) {
    onChange(images.filter((img) => img.mediaId !== mediaId))
  }

  return (
    <div className="form-group" id="product-gallery">
      <label>{label}</label>
      <div className="d-flex flex-wrap" style={{ gap: "0.75rem" }}>
        {images.map((img) => (
          <div
            key={img.mediaId}
            className="position-relative border rounded"
            style={{ width: 80, height: 80, overflow: "hidden" }}
          >
            <img
              src={resolveMediaUrl(img.url)}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <button
              type="button"
              id={`product-gallery-remove-${img.mediaId}`}
              className="btn btn-sm btn-danger position-absolute"
              style={{ top: 0, right: 0, padding: "0 6px", lineHeight: 1.4 }}
              onClick={() => handleRemove(img.mediaId)}
            >
              &times;
            </button>
          </div>
        ))}

        {images.length < max ? (
          <button
            type="button"
            id="product-gallery-add"
            className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
            style={{ width: 80, height: 80 }}
            onClick={() => setModalOpen(true)}
          >
            <i className="fas fa-plus" />
          </button>
        ) : null}
      </div>
      <small className="form-text text-muted">
        {images.length} / {max} images · Supported formats: {SUPPORTED_FORMATS_LABEL} · Max {MEDIA.MAX_UPLOAD_MB}MB
      </small>

      <MediaLibraryModal open={modalOpen} onClose={() => setModalOpen(false)} onSelect={handleSelect} />
    </div>
  )
}
