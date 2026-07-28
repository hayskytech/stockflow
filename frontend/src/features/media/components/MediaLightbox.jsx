import { useEffect, useRef, useState } from "react"
import { downloadMediaFile, resolveMediaUrl } from "@/lib/media"

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

/** Full-size image viewer: zoom/pan, prev/next, download/copy/delete, and a related-images strip. */
export function MediaLightbox({ open, media, onClose, onPrev, onNext, hasPrev, hasNext, onDelete, relatedItems = [], onSelectRelated }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [copied, setCopied] = useState(false)
  const dragState = useRef(null)

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setCopied(false)
  }, [media?.id])

  useEffect(() => {
    if (!open) return undefined
    function handleKey(e) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft" && hasPrev) onPrev()
      else if (e.key === "ArrowRight" && hasNext) onNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext])

  if (!open || !media) return null

  function handleWheel(e) {
    e.preventDefault()
    setZoom((z) => clampZoom(z - e.deltaY * 0.0015))
  }

  function handleMouseDown(e) {
    if (zoom <= MIN_ZOOM) return
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  function handleMouseMove(e) {
    if (!dragState.current) return
    setPan({
      x: dragState.current.panX + (e.clientX - dragState.current.startX),
      y: dragState.current.panY + (e.clientY - dragState.current.startY),
    })
  }

  function handleMouseUp() {
    dragState.current = null
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(resolveMediaUrl(media.url))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const format = (media.mimeType ?? "").split("/")[1]?.toUpperCase() ?? media.mimeType

  return (
    <div
      id="media-lightbox"
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      style={{ background: "rgba(0,0,0,0.85)", overflowY: "auto" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="d-flex flex-column" style={{ minHeight: "100vh", padding: "1rem" }}>
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
          <div className="text-light text-truncate mb-1" style={{ maxWidth: "50%" }}>
            {media.originalName ?? "Untitled"}
          </div>
          <div className="mb-1">
            <button
              id="lightbox-zoom-out"
              type="button"
              className="btn btn-sm btn-outline-light mr-1"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
            >
              <i className="fas fa-search-minus" />
            </button>
            <button
              id="lightbox-zoom-in"
              type="button"
              className="btn btn-sm btn-outline-light mr-2"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
            >
              <i className="fas fa-search-plus" />
            </button>
            <button id="lightbox-download" type="button" className="btn btn-sm btn-outline-light mr-1" onClick={() => downloadMediaFile(media)}>
              <i className="fas fa-download mr-1" /> Download
            </button>
            <button id="lightbox-copy-url" type="button" className="btn btn-sm btn-outline-light mr-1" onClick={handleCopyUrl}>
              <i className="fas fa-link mr-1" /> {copied ? "Copied!" : "Copy URL"}
            </button>
            {onDelete ? (
              <button id="lightbox-delete" type="button" className="btn btn-sm btn-outline-danger mr-2" onClick={onDelete}>
                <i className="fas fa-trash mr-1" /> Delete
              </button>
            ) : null}
            <button id="lightbox-close" type="button" className="btn btn-sm btn-outline-light" onClick={onClose}>
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        <div
          className="flex-grow-1 d-flex align-items-center justify-content-center position-relative"
          style={{ overflow: "hidden", cursor: zoom > MIN_ZOOM ? "grab" : "default" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {hasPrev ? (
            <button
              id="lightbox-prev"
              type="button"
              className="btn btn-light position-absolute"
              style={{ left: "1rem", zIndex: 1 }}
              onClick={onPrev}
            >
              <i className="fas fa-chevron-left" />
            </button>
          ) : null}

          <img
            src={resolveMediaUrl(media.url)}
            alt={media.originalName ?? ""}
            draggable={false}
            style={{
              maxHeight: "70vh",
              maxWidth: "100%",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragState.current ? "none" : "transform 0.1s ease-out",
              userSelect: "none",
            }}
          />

          {hasNext ? (
            <button
              id="lightbox-next"
              type="button"
              className="btn btn-light position-absolute"
              style={{ right: "1rem", zIndex: 1 }}
              onClick={onNext}
            >
              <i className="fas fa-chevron-right" />
            </button>
          ) : null}
        </div>

        <div className="text-center text-light mt-2">
          <span className="badge badge-secondary mr-2">{format}</span>
          <span className="badge badge-secondary mr-2">
            {media.width} × {media.height}
          </span>
          <span className="text-muted">{Math.round(media.sizeBytes / 1024)} KB</span>
        </div>

        {relatedItems.length > 0 ? (
          <div className="d-flex justify-content-center flex-wrap mt-3" style={{ gap: 8 }}>
            {relatedItems.map((item) => (
              <img
                key={item.id}
                src={resolveMediaUrl(item.url)}
                alt={item.originalName ?? ""}
                className="rounded"
                style={{ width: 56, height: 56, objectFit: "cover", cursor: "pointer", opacity: 0.85 }}
                onClick={() => onSelectRelated?.(item.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
