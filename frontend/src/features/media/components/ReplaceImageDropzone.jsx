import { useRef, useState } from "react"

/** Drag-and-drop (or click-to-browse) area that replaces a media item's stored image file. */
export function ReplaceImageDropzone({ onFileSelected, isSubmitting }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(files) {
    const file = files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      id="media-replace-dropzone"
      className={`text-center p-3 rounded ${isDragging ? "border border-primary bg-light" : "border"}`}
      style={{ borderStyle: "dashed", cursor: isSubmitting ? "wait" : "pointer" }}
      onClick={() => !isSubmitting && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (!isSubmitting) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        id="media-replace-file-input"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="d-none"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {isSubmitting ? (
        <span className="text-muted">Replacing…</span>
      ) : (
        <span className="text-muted">
          <i className="fas fa-cloud-upload-alt mr-1" /> Drag &amp; drop a new image here, or click to choose one
        </span>
      )}
    </div>
  )
}
