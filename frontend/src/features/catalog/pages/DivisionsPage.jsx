import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuthStore } from "@/store/auth.store"
import { DivisionFormModal } from "@/features/catalog/components/DivisionFormModal"
import { useCreateDivision, useDeleteDivision, useDivisions, useUpdateDivision } from "@/features/catalog/hooks/use-divisions"

export function DivisionsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [editingDivision, setEditingDivision] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingDivision, setDeletingDivision] = useState(null)
  const [serverError, setServerError] = useState("")

  const { data, isLoading, isError } = useDivisions({ page, per_page: 10, search })
  const createDivision = useCreateDivision()
  const updateDivision = useUpdateDivision()
  const deleteDivision = useDeleteDivision()

  function openAddModal() {
    setEditingDivision(null)
    setServerError("")
    setIsModalOpen(true)
  }

  function openEditModal(division) {
    setEditingDivision(division)
    setServerError("")
    setIsModalOpen(true)
  }

  async function handleSubmit(value) {
    setServerError("")
    try {
      if (editingDivision) {
        await updateDivision.mutateAsync({ id: editingDivision.id, input: value })
      } else {
        await createDivision.mutateAsync(value)
      }
      setIsModalOpen(false)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not save division")
    }
  }

  async function handleDelete() {
    try {
      await deleteDivision.mutateAsync(deletingDivision.id)
      setDeletingDivision(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete division")
      setDeletingDivision(null)
    }
  }

  const columns = [
    { key: "name", label: "Name" },
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
              <>
                <button type="button" className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(row)}>
                  Edit
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingDivision(row)}>
                  Delete
                </button>
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Divisions"
        description="Top-level product lines — Kids Wear, Mens Wear, Ladies Wear…"
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              <i className="fas fa-plus mr-1" />
              Add Division
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
              placeholder="Search divisions…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {serverError && !isModalOpen ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-sitemap"
            emptyTitle="No divisions yet"
            emptyDescription="Add your first division to start building the catalog."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      {isModalOpen ? (
        <DivisionFormModal
          key={editingDivision?.id ?? "new"}
          open={isModalOpen}
          division={editingDivision}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={createDivision.isPending || updateDivision.isPending}
          serverError={serverError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingDivision)}
        title="Delete division?"
        message={`Are you sure you want to delete "${deletingDivision?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingDivision(null)}
      />
    </PageWrapper>
  )
}
