import { useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { UppyUploader } from "@/components/common/UppyUploader"
import { MEDIA_QUERY_KEY, useMediaList } from "@/features/media/hooks/use-media"
import { useMediaStore } from "@/features/media/media.store"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function MediaLibraryPage() {
  const { search, setSearch, page, setPage } = useMediaStore()
  const [unusedOnly, setUnusedOnly] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const queryClient = useQueryClient()
  const siteTitle = useSiteTitle()

  const { data, isLoading, isError } = useMediaList({ search, page, per_page: 24, unused_only: unusedOnly })
  const items = data?.items ?? []

  function handleUploaded() {
    setPage(1)
    queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] })
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Media Library"
        description={`Images uploaded across ${siteTitle} — reuse them or remove what's no longer needed`}
        actions={
          <button
            id="media-upload-toggle"
            type="button"
            className="btn btn-primary"
            onClick={() => setShowUploader((prev) => !prev)}
          >
            <i className="fas fa-upload mr-1" /> Upload
          </button>
        }
      />

      {showUploader ? (
        <div className="card mb-3">
          <div className="card-header">
            <h3 className="card-title">Upload files</h3>
            <div className="card-tools">
              <button
                id="media-upload-close"
                type="button"
                className="btn btn-tool"
                onClick={() => setShowUploader(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
          <div className="card-body">
            <UppyUploader onUploaded={handleUploaded} />
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <input
              id="media-search"
              type="search"
              className="form-control w-auto"
              style={{ minWidth: 260 }}
              placeholder="Search by filename…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <div className="form-check">
              <input
                id="media-unused-only"
                type="checkbox"
                className="form-check-input"
                checked={unusedOnly}
                onChange={(e) => {
                  setUnusedOnly(e.target.checked)
                  setPage(1)
                }}
              />
              <label className="form-check-label" htmlFor="media-unused-only">
                Show unused only
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : isError ? (
            <div className="alert alert-danger">Could not load the media library.</div>
          ) : items.length === 0 ? (
            <EmptyState icon="fa-images" title="No media found" />
          ) : (
            <div className="row">
              {items.map((media) => (
                <div key={media.id} className="col-6 col-md-3 col-lg-2 mb-4">
                  <Link to={ROUTES.MEDIA_LIBRARY.DETAIL(media.id)} className="card h-100 text-decoration-none">
                    <img src={resolveMediaUrl(media.url)} alt={media.originalName ?? ""} className="card-img-top" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                    <div className="card-body p-2">
                      <p className="small text-muted mb-1 text-truncate" title={media.originalName ?? ""}>
                        {media.originalName ?? "Untitled"}
                      </p>
                      <p className="small text-muted mb-0">{Math.round(media.sizeBytes / 1024)} KB</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {data && data.totalPages > 1 ? (
            <nav className="d-flex justify-content-end">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button type="button" className="page-link" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                    Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">
                    Page {page} of {data.totalPages}
                  </span>
                </li>
                <li className={`page-item ${page >= data.totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  )
}
