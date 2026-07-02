import { useEffect, useRef } from "react"
import Uppy from "@uppy/core"
import XHRUpload from "@uppy/xhr-upload"
import Dashboard from "@uppy/react/dashboard"
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api"
import { MEDIA } from "@/constants/app"
import { useAuthStore } from "@/store/auth.store"

/**
 * Thin wrapper around Uppy's Dashboard, wired to POST directly at the media upload
 * endpoint (one request per file). The backend re-validates, compresses to WebP and
 * enforces the size limit itself — this component only handles the transport/UX.
 */
export function UppyUploader({ onUploaded, allowMultiple = true }) {
  const uppyRef = useRef(null)
  if (!uppyRef.current) {
    uppyRef.current = new Uppy({
      restrictions: {
        allowedFileTypes: MEDIA.ALLOWED_MIME_TYPES,
        maxFileSize: MEDIA.MAX_UPLOAD_MB * 1024 * 1024,
        maxNumberOfFiles: allowMultiple ? undefined : 1,
      },
      autoProceed: false,
    }).use(XHRUpload, {
      endpoint: `${API_BASE_URL}${API_ENDPOINTS.MEDIA.UPLOAD}`,
      fieldName: "file",
      formData: true,
      withCredentials: true,
      getResponseData: (res) => {
        try {
          return JSON.parse(res.responseText)
        } catch {
          return {}
        }
      },
      headers: () => {
        const token = useAuthStore.getState().accessToken
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    })
  }

  useEffect(() => {
    const uppy = uppyRef.current
    function handleUploadSuccess(file, response) {
      onUploaded?.(response.body, file)
      uppy.removeFile(file.id)
    }
    uppy.on("upload-success", handleUploadSuccess)
    return () => uppy.off("upload-success", handleUploadSuccess)
  }, [onUploaded])

  return <Dashboard uppy={uppyRef.current} height={300} proudlyDisplayPoweredByUppy={false} />
}
