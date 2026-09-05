import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { formatDateIST } from "@/lib/format"
import { ROUTES, businessPath } from "@/constants/routes"
import { BusinessFormModal } from "@/features/businesses/components/BusinessFormModal"
import { BusinessMembersModal } from "@/features/businesses/components/BusinessMembersModal"
import {
  useBusinesses,
  useCreateBusiness,
  useDeactivateBusiness,
  useUpdateBusiness,
} from "@/features/businesses/hooks/use-businesses"

export function BusinessesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [membersOf, setMembersOf] = useState(null)
  const [togglingBusiness, setTogglingBusiness] = useState(null)
  const [pageError, setPageError] = useState("")

  const { data, isLoading, isError } = useBusinesses({
    page,
    per_page: 10,
    search: search || undefined,
  })

  const createBusiness = useCreateBusiness()
  const updateBusiness = useUpdateBusiness()
  const deactivateBusiness = useDeactivateBusiness()

  function openCreate() {
    setEditing(null)
    setFormError("")
    setPasswordError("")
    setFormOpen(true)
  }

  function openEdit(business) {
    setEditing(business)
    setFormError("")
    setPasswordError("")
    setFormOpen(true)
  }

  async function handleSubmit(input) {
    setFormError("")
    setPasswordError("")
    try {
      if (editing) {
        await updateBusiness.mutateAsync({ id: editing.id, body: input })
      } else {
        await createBusiness.mutateAsync(input)
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      const message = err.response?.data?.message ?? "Could not save business"
      if (err.response?.status === 400 && /password/i.test(message)) {
        setPasswordError(message)
      } else {
        setFormError(message)
      }
    }
  }

  async function handleToggleActive() {
    setPageError("")
    const business = togglingBusiness
    try {
      if (business.is_active) {
        await deactivateBusiness.mutateAsync(business.id)
      } else {
        await updateBusiness.mutateAsync({ id: business.id, body: { isActive: true } })
      }
      setTogglingBusiness(null)
    } catch (err) {
      setPageError(err.response?.data?.message ?? "Could not update business")
      setTogglingBusiness(null)
    }
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <Link to={businessPath(row.id, ROUTES.DASHBOARD)}>{row.name}</Link>
      ),
    },
    { key: "slug", label: "Slug", render: (row) => <code>{row.slug}</code> },
    { key: "memberCount", label: "Members", render: (row) => row.memberCount ?? 0 },
    {
      key: "is_active",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.is_active ? "badge-success" : "badge-secondary"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => (row.created_at ? formatDateIST(row.created_at) : "—"),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <RowActionsMenu
          actions={[
            { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEdit(row) },
            { key: "members", label: "View members", icon: "fa-users", onClick: () => setMembersOf(row) },
            {
              key: "open",
              label: "Open business",
              icon: "fa-arrow-right",
              onClick: () => navigate(businessPath(row.id, ROUTES.DASHBOARD)),
            },
            row.is_active
              ? {
                  key: "deactivate",
                  label: "Deactivate",
                  icon: "fa-ban",
                  variant: "danger",
                  onClick: () => setTogglingBusiness(row),
                }
              : {
                  key: "activate",
                  label: "Activate",
                  icon: "fa-check",
                  onClick: () => setTogglingBusiness(row),
                },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Businesses"
        count={data?.total}
        description="Every business on the platform. Create one and assign its first admin."
        actions={
          <button type="button" id="new-business-btn" className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus mr-1" />
            New business
          </button>
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="form-group mb-3" style={{ maxWidth: 320 }}>
            <input
              id="businesses-search"
              type="search"
              className="form-control"
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {pageError ? <div className="alert alert-danger">{pageError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-store"
            emptyTitle="No businesses yet"
            emptyDescription="Create the first business to get started."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <BusinessFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        business={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createBusiness.isPending || updateBusiness.isPending}
        serverError={formError}
        passwordError={passwordError}
      />

      <BusinessMembersModal
        open={Boolean(membersOf)}
        business={membersOf}
        onClose={() => setMembersOf(null)}
      />

      <ConfirmDialog
        open={Boolean(togglingBusiness)}
        title={togglingBusiness?.is_active ? "Deactivate business?" : "Activate business?"}
        message={
          togglingBusiness?.is_active
            ? `"${togglingBusiness?.name}" will be hidden and its members lose access until it is reactivated. Data is kept.`
            : `"${togglingBusiness?.name}" will be reactivated and its members regain access.`
        }
        onConfirm={handleToggleActive}
        onCancel={() => setTogglingBusiness(null)}
      />
    </PageWrapper>
  )
}
