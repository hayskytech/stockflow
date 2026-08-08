import { API_BASE_URL } from "@/constants/api"

// API_BASE_URL may be root-relative (/api), which resolves against the page's own origin.
const MEDIA_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin

/** Resolves a root-relative media URL returned by the API (e.g. "/media-files/..") against the API's origin. */
export function resolveMediaUrl(url) {
  if (!url) return url
  return /^https?:\/\//.test(url) ? url : `${MEDIA_ORIGIN}${url}`
}

/** Fetches a media file as a blob and triggers a same-origin download — a cross-origin `<a download>` would just open it instead. */
export async function downloadMediaFile(media) {
  const res = await fetch(resolveMediaUrl(media.url))
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = media.originalName || "image"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
