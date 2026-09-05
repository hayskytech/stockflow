import { useState } from "react"
import { useParams } from "react-router-dom"
import { Navigate } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { useMe } from "@/features/auth/hooks/use-me"
import { userDisplayName } from "@/lib/user"
import { formatDateIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"
import { AddMemberModal } from "@/features/members/components/AddMemberModal"
import { MemberRoleModal } from "@/features/members/components/MemberRoleModal"
import {
  useAddMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/features/members/hooks/use-members"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
}

/** Reads the acting user's role in THIS business (or super admin) to gate the page + actions. */
function useIsCurrentBusinessAdmin() {
  const { businessId } = useParams()
  const { data: me, isLoading } = useMe()
  const role = me?.businesses?.find((b) => b.id === businessId)?.role
  return { isAdmin: role === "admin" || Boolean(me?.isSuperAdmin), isLoading }
}

export function MembersPage() {
  const { isAdmin, isLoading: isLoadingMe } = useIsCurrentBusinessAdmin()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [addPasswordError, setAddPasswordError] = useState("")
  const [addServerError, setAddServerError] = useState("")
  const [roleMember, setRoleMember] = useState(null)
  const [roleServerError, setRoleServerError] = useState("")
  const [removingMember, setRemovingMember] = useState(null)
  const [pageError, setPageError] = useState("")

  const { data, isLoading, isError } = useMembers({ page, per_page: 10, search }, { enabled: isAdmin })
  const addMember = useAddMember()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  if (!isLoadingMe && !isAdmin) {
    // Non-admins of this business have no business here — back to the dashboard.
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  function openAdd() {
    setAddPasswordError("")
    setAddServerError("")
    setAddOpen(true)
  }

  async function handleAdd(body) {
    setAddPasswordError("")
    setAddServerError("")
    try {
      await addMember.mutateAsync(body)
      setAddOpen(false)
    } catch (err) {
      const message = err.response?.data?.message ?? "Could not add member"
      if (err.response?.status === 400 && /password/i.test(message)) {
        setAddPasswordError(message)
      } else {
        setAddServerError(message)
      }
    }
  }

  function openRoleModal(member) {
    setRoleServerError("")
    setRoleMember(member)
  }

  async function handleRoleChange(role) {
    setRoleServerError("")
    try {
      await updateRole.mutateAsync({ userId: roleMember.userId, role })
      setRoleMember(null)
    } catch (err) {
      // 409 = last-admin guard; show it inline in the modal.
      setRoleServerError(err.response?.data?.message ?? "Could not change role")
    }
  }

  async function handleRemove() {
    setPageError("")
    try {
      await removeMember.mutateAsync(removingMember.userId)
      setRemovingMember(null)
    } catch (err) {
      setPageError(err.response?.data?.message ?? "Could not remove member")
      setRemovingMember(null)
    }
  }

  const columns = [
    { key: "name", label: "Name", render: (row) => userDisplayName(row) },
    { key: "email", label: "Email", render: (row) => row.email ?? "—" },
    { key: "phone", label: "Phone", render: (row) => row.phone ?? "—" },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span className={`badge ${ROLE_BADGES[row.role] ?? "badge-secondary"}`}>{row.role}</span>
      ),
    },
    {
      key: "memberSince",
      label: "Member since",
      render: (row) => (row.memberSince ? formatDateIST(row.memberSince) : "—"),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <RowActionsMenu
          actions={[
            { key: "role", label: "Change role", icon: "fa-user-shield", onClick: () => openRoleModal(row) },
            {
              key: "remove",
              label: "Remove",
              icon: "fa-user-minus",
              variant: "danger",
              onClick: () => setRemovingMember(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Members"
        count={data?.total}
        description="Admin and staff accounts with access to this business"
        actions={
          <button type="button" id="add-member-btn" className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus mr-1" />
            Add member
          </button>
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="form-group mb-3" style={{ maxWidth: 320 }}>
            <input
              id="members-search"
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

          {pageError ? <div className="alert alert-danger">{pageError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-users"
            emptyTitle="No members yet"
            emptyDescription="Add an admin or staff account to give someone access to this business."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      {addOpen ? (
        <AddMemberModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
          isSubmitting={addMember.isPending}
          serverError={addServerError}
          passwordError={addPasswordError}
        />
      ) : null}

      {roleMember ? (
        <MemberRoleModal
          key={roleMember.userId}
          open={Boolean(roleMember)}
          member={roleMember}
          onClose={() => setRoleMember(null)}
          onSubmit={handleRoleChange}
          isSubmitting={updateRole.isPending}
          serverError={roleServerError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(removingMember)}
        title="Remove member?"
        message={`Remove "${userDisplayName(removingMember ?? {})}" from this business? They keep their account but lose access here.`}
        onConfirm={handleRemove}
        onCancel={() => setRemovingMember(null)}
      />
    </PageWrapper>
  )
}
