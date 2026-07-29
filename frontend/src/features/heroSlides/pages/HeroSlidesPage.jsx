import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { resolveMediaUrl } from "@/lib/media"
import { useHeroSlidesStore } from "@/features/heroSlides/heroSlides.store"
import { HeroSlideFormModal } from "@/features/heroSlides/components/HeroSlideFormModal"
import {
  useCreateHeroSlide,
  useDeleteHeroSlide,
  useHeroSlides,
  useReorderHeroSlides,
  useUpdateHeroSlide,
} from "@/features/heroSlides/hooks/use-hero-slides"

export function HeroSlidesPage() {
  const showInactiveOnly = useHeroSlidesStore((s) => s.showInactiveOnly)
  const setShowInactiveOnly = useHeroSlidesStore((s) => s.setShowInactiveOnly)

  const [editingSlide, setEditingSlide] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingSlide, setDeletingSlide] = useState(null)
  const [serverError, setServerError] = useState("")

  // Homepage sliders are a short, curated list — fetch them all in one page so drag-and-drop
  // reordering (which needs the complete set) is available by default.
  const { data, isLoading, isError } = useHeroSlides({ per_page: 100, order: "asc" })
  const createHeroSlide = useCreateHeroSlide()
  const updateHeroSlide = useUpdateHeroSlide()
  const deleteHeroSlide = useDeleteHeroSlide()
  const reorderHeroSlides = useReorderHeroSlides()

  const allRows = data?.items ?? []
  const rows = showInactiveOnly ? allRows.filter((row) => !row.isActive) : allRows
  const canReorder = !showInactiveOnly && rows.length > 1
  const { getDragHandlers } = useSortableList({
    items: rows,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderHeroSlides.mutateAsync(newOrder.map((row) => row.id))
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not reorder slides")
      }
    },
  })

  function openAddModal() {
    setEditingSlide(null)
    setServerError("")
    setIsModalOpen(true)
  }

  function openEditModal(slide) {
    setEditingSlide(slide)
    setServerError("")
    setIsModalOpen(true)
  }

  async function handleSubmit(value) {
    setServerError("")
    try {
      if (editingSlide) {
        await updateHeroSlide.mutateAsync({ id: editingSlide.id, input: value })
      } else {
        await createHeroSlide.mutateAsync(value)
      }
      setIsModalOpen(false)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not save slide")
    }
  }

  async function handleDelete() {
    try {
      await deleteHeroSlide.mutateAsync(deletingSlide.id)
      setDeletingSlide(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete slide")
      setDeletingSlide(null)
    }
  }

  const columns = [
    ...(canReorder ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
    {
      key: "preview",
      label: "Preview",
      render: (row) => (
        <div style={{ width: 128, aspectRatio: "16 / 9", overflow: "hidden" }} className="rounded border">
          <img
            src={resolveMediaUrl(row.mediaUrl)}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ),
    },
    {
      key: "linkUrl",
      label: "Link",
      render: (row) =>
        row.linkUrl ? (
          <a href={row.linkUrl} target="_blank" rel="noreferrer">
            {row.linkUrl}
          </a>
        ) : (
          <span className="text-muted">None</span>
        ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <RowActionsMenu
          actions={[
            { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEditModal(row) },
            {
              key: "delete",
              label: "Delete",
              icon: "fa-trash",
              variant: "danger",
              onClick: () => setDeletingSlide(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Homepage Sliders"
        count={data?.total}
        description="Full-width 16:9 image slides shown at the top of the storefront homepage."
        actions={
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus mr-1" />
            Add Slide
          </button>
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="form-group form-check mb-3">
            <input
              id="hero-slides-show-inactive-only"
              type="checkbox"
              className="form-check-input"
              checked={showInactiveOnly}
              onChange={(e) => setShowInactiveOnly(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="hero-slides-show-inactive-only">
              Show inactive slides only
            </label>
            {showInactiveOnly ? (
              <small className="form-text text-muted">Turn this off to drag rows and reorder.</small>
            ) : null}
          </div>

          {serverError && !isModalOpen ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-photo-film"
            emptyTitle="No slides yet"
            emptyDescription="Add your first homepage slide to get started."
            getRowProps={canReorder ? (row) => getDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {isModalOpen ? (
        <HeroSlideFormModal
          key={editingSlide?.id ?? "new"}
          open={isModalOpen}
          slide={editingSlide}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={createHeroSlide.isPending || updateHeroSlide.isPending}
          serverError={serverError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingSlide)}
        title="Delete slide?"
        message="Are you sure you want to remove this slide from the homepage? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeletingSlide(null)}
      />
    </PageWrapper>
  )
}
