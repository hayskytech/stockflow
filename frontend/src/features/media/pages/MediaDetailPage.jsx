import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useMediaItem, useDeleteMedia, useRenameMedia } from "@/features/media/hooks/use-media"
import { renameMediaSchema } from "@/features/media/media.schema"
import { resolveMediaUrl } from "@/lib/media"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

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

  const { data: media, isLoading, isError } = useMediaItem(id)
  const deleteMedia = useDeleteMedia()

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
        <Link to={ROUTES.MEDIA_LIBRARY.LIST}>Back to Media Library</Link>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={media.originalName ?? "Untitled"}
        description="Media item details"
        actions={
          <>
            <Link to={ROUTES.MEDIA_LIBRARY.LIST} className="btn btn-outline-secondary mr-2">
              Back to Media Library
            </Link>
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

      <div className="row">
        <div className="col-md-5">
          <div className="card">
            <div className="card-body text-center">
              <img
                src={resolveMediaUrl(media.url)}
                alt={media.originalName ?? ""}
                className="img-fluid rounded"
                style={{ maxHeight: 360, objectFit: "contain" }}
              />
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
                    <RenameForm media={media} onSaved={() => setIsEditingName(false)} onCancel={() => setIsEditingName(false)} />
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

                <dt className="col-sm-4">Type</dt>
                <dd className="col-sm-8">{media.mimeType}</dd>

                <dt className="col-sm-4">Size</dt>
                <dd className="col-sm-8">{Math.round(media.sizeBytes / 1024)} KB</dd>

                <dt className="col-sm-4">Dimensions</dt>
                <dd className="col-sm-8">
                  {media.width} × {media.height}
                </dd>

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
    </PageWrapper>
  )
}
