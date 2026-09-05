import { useState } from "react"
import { Link } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAdminSessions, useRevokeAnySession } from "@/features/users/hooks/use-admin-sessions"
import { formatDateTimeIST } from "@/lib/format"
import { userDisplayName } from "@/lib/user"
import { ROUTES } from "@/constants/routes"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
  customer: "badge-secondary",
}

/**
 * Admin-only, bird's-eye view across every user's active sessions (GET /admin/sessions,
 * unscoped). The per-user view lives on UserViewPage's "Sessions" tab — this page is for
 * finding/terminating a specific session without already knowing which user it belongs to.
 */
export function AdminSessionsPage() {
  const [page, setPage] = useState(1)
  const [revokingSession, setRevokingSession] = useState(null)
  const [serverError, setServerError] = useState("")

  const { data, isLoading, isError } = useAdminSessions({ page, per_page: 20 })
  const revokeSession = useRevokeAnySession()

  async function handleRevoke() {
    setServerError("")
    try {
      await revokeSession.mutateAsync(revokingSession.id)
      setRevokingSession(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not revoke session")
      setRevokingSession(null)
    }
  }

  const columns = [
    {
      key: "user",
      label: "User",
      render: (row) => (
        <>
          <Link to={ROUTES.USERS.DETAIL(row.userId)}>
            {userDisplayName({ name: row.userName, phone: row.userPhone })}
          </Link>
          <span className={`badge ${ROLE_BADGES[row.userRole] ?? "badge-secondary"} ml-2`}>{row.userRole}</span>
        </>
      ),
    },
    { key: "userEmail", label: "Email", render: (row) => row.userEmail ?? "—" },
    { key: "deviceInfo", label: "Device", render: (row) => row.deviceInfo ?? "Unknown device" },
    { key: "ipAddress", label: "IP Address", render: (row) => row.ipAddress ?? "—" },
    {
      key: "lastUsedAt",
      label: "Last Used",
      render: (row) => (row.lastUsedAt ? formatDateTimeIST(row.lastUsedAt) : "—"),
    },
    { key: "createdAt", label: "Signed In", render: (row) => formatDateTimeIST(row.createdAt) },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => setRevokingSession(row)}
        >
          Revoke
        </button>
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Active Sessions"
        count={data?.total}
        description="Every signed-in device across all users. Terminate a session to sign that device out."
      />

      <div className="card">
        <div className="card-body">
          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-desktop"
            emptyTitle="No active sessions"
            emptyDescription="Signed-in devices will show up here."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(revokingSession)}
        title="Revoke session?"
        message="This will sign that device out the next time it tries to refresh its session."
        onConfirm={handleRevoke}
        onCancel={() => setRevokingSession(null)}
      />
    </PageWrapper>
  )
}
