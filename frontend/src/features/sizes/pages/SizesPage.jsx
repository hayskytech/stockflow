import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { useCurrentBusinessRole } from "@/hooks/use-current-business-role"
import { SizeFormModal } from "@/features/sizes/components/SizeFormModal"
import { useCreateSize, useDeleteSize, useReorderSizes, useSizes, useUpdateSize } from "@/features/sizes/hooks/use-sizes"

export function SizesPage() {
  const { isAdmin } = useCurrentBusinessRole()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [editingSize, setEditingSize] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingSize, setDeletingSize] = useState(null)
  const [serverError, setServerError] = useState("")

  // Sizes are a short, curated list — fetch them all in one page so drag-and-drop
  // reordering (which needs the complete set) is available by default.
  const { data, isLoading, isError } = useSizes({ page, per_page: 100, search, order: "asc" })
  const createSize = useCreateSize()
  const updateSize = useUpdateSize()
  const deleteSize = useDeleteSize()
  const reorderSizes = useReorderSizes()

  const rows = data?.items ?? []
  const canReorder = isAdmin && !search && (data?.totalPages ?? 1) <= 1 && rows.length > 1
  const { getDragHandlers } = useSortableList({
    items: rows,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderSizes.mutateAsync(newOrder.map((row) => row.id))
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not reorder sizes")
      }
    },
  })

  function openAddModal() {
    setEditingSize(null)
    setServerError("")
    setIsModalOpen(true)
  }

  function openEditModal(size) {
    setEditingSize(size)
    setServerError("")
    setIsModalOpen(true)
  }

  async function handleSubmit(value) {
    setServerError("")
    try {
      if (editingSize) {
        await updateSize.mutateAsync({ id: editingSize.id, input: value })
      } else {
        await createSize.mutateAsync(value)
      }
      setIsModalOpen(false)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not save size")
    }
  }

  async function handleDelete() {
    try {
      await deleteSize.mutateAsync(deletingSize.id)
      setDeletingSize(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete size")
      setDeletingSize(null)
    }
  }

  const columns = [
    ...(canReorder ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
    { key: "value", label: "Size" },
    {
      key: "isActive",
      label: "Status",
      render: (row) => <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span>,
    },
    ...(isAdmin
      ? [
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
                    onClick: () => setDeletingSize(row),
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Sizes"
        count={data?.total}
        description="Predefined size picklist used by the Product and Stock forms"
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              <i className="fas fa-plus mr-1" />
              Add Size
            </button>
          ) : null
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="form-group mb-3" style={{ maxWidth: 320 }}>
            <input
              type="search"
              className="form-control"
              placeholder="Search sizes…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {isAdmin ? (
              <small className="form-text text-muted">
                {canReorder ? "Drag rows to reorder." : "Clear the search to drag rows and reorder."}
              </small>
            ) : null}
          </div>

          {serverError && !isModalOpen ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-ruler"
            emptyTitle="No sizes yet"
            emptyDescription="Add your first size to start using it on products and stock."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            getRowProps={canReorder ? (row) => getDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {isModalOpen ? (
        <SizeFormModal
          key={editingSize?.id ?? "new"}
          open={isModalOpen}
          size={editingSize}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={createSize.isPending || updateSize.isPending}
          serverError={serverError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingSize)}
        title="Delete size?"
        message={`Are you sure you want to delete "${deletingSize?.value}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSize(null)}
      />
    </PageWrapper>
  )
}
