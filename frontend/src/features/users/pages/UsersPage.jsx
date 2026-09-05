import { useState } from "react"
import { Link } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { useAuthStore } from "@/store/auth.store"
import { useUsersStore } from "@/features/users/users.store"
import { UserFormModal } from "@/features/users/components/UserFormModal"
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/features/users/hooks/use-users"
import { userDisplayName } from "@/lib/user"
import { ROUTES } from "@/constants/routes"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
  customer: "badge-secondary",
}

const ROLE_FILTERS = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
]

export function UsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id)

  const search = useUsersStore((s) => s.search)
  const setSearch = useUsersStore((s) => s.setSearch)
  const roleFilter = useUsersStore((s) => s.roleFilter)
  const setRoleFilter = useUsersStore((s) => s.setRoleFilter)

  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [formError, setFormError] = useState("")
  const [serverError, setServerError] = useState("")

  const { data, isLoading, isError } = useUsers({
    page,
    per_page: 10,
    search,
    role: roleFilter || undefined,
  })

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  function openCreate() {
    setEditingUser(null)
    setFormError("")
    setModalOpen(true)
  }

  function openEdit(user) {
    setEditingUser(user)
    setFormError("")
    setModalOpen(true)
  }

  async function handleSubmit(input) {
    setFormError("")
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, input })
      } else {
        await createUser.mutateAsync(input)
      }
      setModalOpen(false)
      setEditingUser(null)
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Could not save user")
    }
  }

  async function handleDelete() {
    try {
      await deleteUser.mutateAsync(deletingUser.id)
      setDeletingUser(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete user")
      setDeletingUser(null)
    }
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      // A customer created by OTP login has no name until they complete their profile — the badge
      // says why the row looks half-empty rather than leaving an admin to guess.
      render: (row) => (
        <>
          <Link to={ROUTES.ADMIN.USER_DETAIL(row.id)}>{userDisplayName(row)}</Link>
          {row.profileCompletedAt ? null : (
            <span className="badge badge-warning ml-2">Profile incomplete</span>
          )}
        </>
      ),
    },
    { key: "email", label: "Email", render: (row) => row.email ?? "—" },
    {
      key: "role",
      label: "Role",
      render: (row) => <span className={`badge ${ROLE_BADGES[row.role] ?? "badge-secondary"}`}>{row.role}</span>,
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
            { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEdit(row) },
            row.id !== currentUserId && {
              key: "delete",
              label: "Delete",
              icon: "fa-trash",
              variant: "danger",
              onClick: () => setDeletingUser(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Users / Staff"
        count={data?.total}
        description="Manage admin, staff, and customer accounts"
        actions={
          <>
            <Link id="users-view-sessions-link" to={ROUTES.ADMIN.SESSIONS} className="btn btn-outline-secondary mr-2">
              <i className="fas fa-desktop mr-1" />
              Active Sessions
            </Link>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <i className="fas fa-plus mr-1" />
              Add User
            </button>
          </>
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <input
                type="search"
                className="form-control"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setPage(1)
                }}
              >
                {ROLE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-users"
            emptyTitle="No users yet"
            emptyDescription="Add your first user to get started."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <UserFormModal
        key={editingUser?.id ?? "new"}
        open={modalOpen}
        user={editingUser}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createUser.isPending || updateUser.isPending}
        serverError={formError}
      />

      <ConfirmDialog
        open={Boolean(deletingUser)}
        title="Delete user?"
        message={
          deletingUser?.role === "customer"
            ? `This will deactivate "${deletingUser?.name}"'s account. Their order history is kept, and the account reactivates automatically if they (or you) re-add the same email or phone number.`
            : `Are you sure you want to delete "${deletingUser?.name}"? This cannot be undone.`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </PageWrapper>
  )
}
