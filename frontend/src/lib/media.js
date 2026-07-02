import { API_BASE_URL } from "@/constants/api"

const MEDIA_ORIGIN = new URL(API_BASE_URL).origin

/** Resolves a root-relative media URL returned by the API (e.g. "/media-files/..") against the API's origin. */
export function resolveMediaUrl(url) {
  if (!url) return url
  return /^https?:\/\//.test(url) ? url : `${MEDIA_ORIGIN}${url}`
}
