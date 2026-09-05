import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useAppNavigate as useNavigate } from "@/hooks/use-app-navigate"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import {
  useDeleteMedia,
  useMediaItem,
  useMediaList,
  useRelatedMedia,
  useRenameMedia,
  useReplaceMediaFile,
} from "@/features/media/hooks/use-media"
import { MediaLightbox } from "@/features/media/components/MediaLightbox"
import { ReplaceImageDropzone } from "@/features/media/components/ReplaceImageDropzone"
import { renameMediaSchema } from "@/features/media/media.schema"
import { downloadMediaFile, resolveMediaUrl } from "@/lib/media"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

// Browsing order for Prev/Next covers only the most recent 100 items (the per_page cap) — fine at this app's scale.
const BROWSE_LIST_PARAMS = { page: 1, per_page: 100 }

function RenameForm({ media, onSaved, onCancel }) {
  const renameMedia = useRenameMedia()
  const [serverError, setServerError] = useState("")

  const form = useForm({
    defaultValues: { originalName: media.originalName ?? "" },
    validators: { onSubmit: renameMediaSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        await renameMedia.mutateAsync({ id: media.id, originalName: value.originalName })
        onSaved()
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not rename this file")
      }
    },
  })

  return (
    <form
      id="media-rename-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="originalName">
        {(field) => (
          <div className="form-group mb-2">
            <div className="input-group">
              <input
                id="media-rename-input"
                className="form-control"
                autoFocus
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <div className="input-group-append">
                <button
                  id="media-rename-save"
                  type="submit"
                  className="btn btn-primary"
                  disabled={renameMedia.isPending}
                >
                  {renameMedia.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  id="media-rename-cancel"
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onCancel}
                  disabled={renameMedia.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
            {field.state.meta.errors.length > 0 ? (
              <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
            ) : null}
          </div>
        )}
      </form.Field>

      {serverError ? <div className="alert alert-danger py-2 mb-0">{serverError}</div> : null}
    </form>
  )
}

export function MediaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [renameSuccess, setRenameSuccess] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [replaceError, setReplaceError] = useState("")

  const { data: media, isLoading, isError } = useMediaItem(id)
  const { data: browseList } = useMediaList(BROWSE_LIST_PARAMS)
  const { data: relatedItems = [] } = useRelatedMedia(id)
  const deleteMedia = useDeleteMedia()
  const replaceMediaFile = useReplaceMediaFile()

  useEffect(() => {
    if (!renameSuccess) return undefined
    const timer = setTimeout(() => setRenameSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [renameSuccess])

  const browseItems = browseList?.items ?? []
  const currentIndex = browseItems.findIndex((item) => item.id === id)
  const prevItem = currentIndex > 0 ? browseItems[currentIndex - 1] : null
  const nextItem = currentIndex >= 0 && currentIndex < browseItems.length - 1 ? browseItems[currentIndex + 1] : null

  function goToMedia(newId) {
    navigate(ROUTES.MEDIA_LIBRARY.DETAIL(newId), { replace: true })
  }

  async function handleConfirmDelete() {
    setDeleteError("")
    try {
      await deleteMedia.mutateAsync(id)
      navigate(ROUTES.MEDIA_LIBRARY.LIST)
    } catch (err) {
      setDeleteError(err.response?.data?.message ?? "Could not delete this media item")
      setConfirmOpen(false)
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(resolveMediaUrl(media.url))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleReplaceFile(file) {
    setReplaceError("")
    try {
      await replaceMediaFile.mutateAsync({ id, file })
    } catch (err) {
      setReplaceError(err.response?.data?.message ?? "Could not replace this image")
    }
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isError || !media) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Media item not found.</div>
      </PageWrapper>
    )
  }

  const format = (media.mimeType ?? "").split("/")[1]?.toUpperCase() ?? media.mimeType

  return (
    <PageWrapper>
      <PageHeader
        title={media.originalName ?? "Untitled"}
        description="Media item details"
        actions={
          <>
            <button id="media-detail-download" type="button" className="btn btn-outline-secondary mr-2" onClick={() => downloadMediaFile(media)}>
              <i className="fas fa-download mr-1" /> Download
            </button>
            <button id="media-detail-copy-url" type="button" className="btn btn-outline-secondary mr-2" onClick={handleCopyUrl}>
              <i className="fas fa-link mr-1" /> {copied ? "Copied!" : "Copy Image URL"}
            </button>
            <button
              id="media-detail-delete-button"
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setConfirmOpen(true)}
            >
              Delete
            </button>
          </>
        }
      />

      {deleteError ? <div className="alert alert-danger">{deleteError}</div> : null}
      {renameSuccess ? <div className="alert alert-success">File name updated.</div> : null}

      <div className="row">
        <div className="col-md-5">
          <div className="card">
            <div className="card-body text-center">
              <img
                id="media-detail-preview"
                src={resolveMediaUrl(media.url)}
                alt={media.originalName ?? ""}
                className="img-fluid rounded"
                style={{ maxHeight: 360, objectFit: "contain", cursor: "zoom-in" }}
                onClick={() => setLightboxOpen(true)}
              />
              <div className="mt-2">
                <span className="badge badge-secondary mr-2">{format}</span>
                <span className="badge badge-secondary mr-2">
                  {media.width} × {media.height}
                </span>
              </div>
              <p className="text-muted small mb-0 mt-1">{Math.round(media.sizeBytes / 1024)} KB</p>

              <div className="d-flex justify-content-between mt-3">
                <button
                  id="media-detail-prev"
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!prevItem}
                  onClick={() => prevItem && goToMedia(prevItem.id)}
                >
                  <i className="fas fa-chevron-left mr-1" /> Previous
                </button>
                <button
                  id="media-detail-next"
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!nextItem}
                  onClick={() => nextItem && goToMedia(nextItem.id)}
                >
                  Next <i className="fas fa-chevron-right ml-1" />
                </button>
              </div>
            </div>
          </div>

          {relatedItems.length > 0 ? (
            <div className="card mt-3">
              <div className="card-body">
                <h6 className="card-title">Related images</h6>
                <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                  {relatedItems.map((item) => (
                    <img
                      key={item.id}
                      src={resolveMediaUrl(item.url)}
                      alt={item.originalName ?? ""}
                      className="rounded"
                      style={{ width: 56, height: 56, objectFit: "cover", cursor: "pointer" }}
                      onClick={() => goToMedia(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">Replace image</h6>
              {replaceError ? <div className="alert alert-danger py-2">{replaceError}</div> : null}
              <ReplaceImageDropzone onFileSelected={handleReplaceFile} isSubmitting={replaceMediaFile.isPending} />
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Details</h5>
              <dl className="row mb-0">
                <dt className="col-sm-4">File name</dt>
                <dd className="col-sm-8">
                  {isEditingName ? (
                    <RenameForm
                      media={media}
                      onSaved={() => {
                        setIsEditingName(false)
                        setRenameSuccess(true)
                      }}
                      onCancel={() => setIsEditingName(false)}
                    />
                  ) : (
                    <>
                      {media.originalName ?? "Untitled"}
                      <button
                        id="media-rename-edit"
                        type="button"
                        className="btn btn-sm btn-link p-0 ml-2"
                        onClick={() => setIsEditingName(true)}
                      >
                        <i className="fas fa-pencil-alt" /> Edit
                      </button>
                    </>
                  )}
                </dd>

                <dt className="col-sm-4">Uploaded by</dt>
                <dd className="col-sm-8">{media.uploadedByName ?? "Unknown"}</dd>

                <dt className="col-sm-4">Uploaded</dt>
                <dd className="col-sm-8">{formatDateTimeIST(media.createdAt)}</dd>

                <dt className="col-sm-4">Last updated</dt>
                <dd className="col-sm-8">{formatDateTimeIST(media.updatedAt)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete media item?"
        message="This permanently removes the file. It can't be undone, and it's blocked if anything still uses it."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <MediaLightbox
        open={lightboxOpen}
        media={media}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => prevItem && goToMedia(prevItem.id)}
        onNext={() => nextItem && goToMedia(nextItem.id)}
        hasPrev={Boolean(prevItem)}
        hasNext={Boolean(nextItem)}
        onDelete={() => {
          setLightboxOpen(false)
          setConfirmOpen(true)
        }}
        relatedItems={relatedItems}
        onSelectRelated={goToMedia}
      />
    </PageWrapper>
  )
}
