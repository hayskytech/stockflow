/** Triggers a browser download for an in-memory blob (e.g. an authenticated file response). */
export function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
