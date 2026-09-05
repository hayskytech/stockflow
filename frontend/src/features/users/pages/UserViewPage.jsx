import { useState } from "react"
import { useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { UserFormModal } from "@/features/users/components/UserFormModal"
import { useUserDetail } from "@/features/users/hooks/use-user-detail"
import { useUpdateUser } from "@/features/users/hooks/use-users"
import { useAdminSessions, useForceLogoutUser, useRevokeAnySession } from "@/features/users/hooks/use-admin-sessions"
import { formatDateTimeIST } from "@/lib/format"
import { userDisplayName } from "@/lib/user"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
  customer: "badge-secondary",
}

const TABS = [
  { key: "details", label: "Details", icon: "fa-id-card" },
  { key: "sessions", label: "Sessions", icon: "fa-desktop" },
]

/**
 * Global user directory detail page (platform super-admin, `/admin/users/:id`).
 *
 * The old "Orders"/"Payments" tabs were backed by `GET /orders?customer_id=`, which is now
 * business-scoped. Customer orders are on hold with the storefront (see multitenant_plan.md
 * Phase 1), so those tabs are gone — Details + Sessions remain. `/admin/sessions` is still a
 * valid super-admin endpoint.
 */
export function UserViewPage() {
  const { id } = useParams()

  const [tab, setTab] = useState("details")
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formError, setFormError] = useState("")
  const [revokingSession, setRevokingSession] = useState(null)
  const [forceLogoutConfirmOpen, setForceLogoutConfirmOpen] = useState(false)
  const [sessionsError, setSessionsError] = useState("")

  const { data: user, isLoading, isError } = useUserDetail(id)
  const { data: sessionsData, isLoading: isLoadingSessions, isError: isSessionsError } = useAdminSessions(
    { user_id: id },
    { enabled: tab === "sessions" },
  )
  const updateUser = useUpdateUser()
  const revokeSession = useRevokeAnySession()
  const forceLogout = useForceLogoutUser()

  async function handleEditSubmit(input) {
    setFormError("")
    try {
      await updateUser.mutateAsync({ id, input })
      setEditModalOpen(false)
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Could not save user")
    }
  }

  async function handleRevokeSession() {
    setSessionsError("")
    try {
      await revokeSession.mutateAsync(revokingSession.id)
      setRevokingSession(null)
    } catch (err) {
      setSessionsError(err.response?.data?.message ?? "Could not revoke session")
      setRevokingSession(null)
    }
  }

  async function handleForceLogout() {
    setSessionsError("")
    try {
      await forceLogout.mutateAsync(id)
      setForceLogoutConfirmOpen(false)
    } catch (err) {
      setSessionsError(err.response?.data?.message ?? "Could not sign this user out everywhere")
      setForceLogoutConfirmOpen(false)
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

  if (isError || !user) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Could not load this user.</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={userDisplayName(user)}
        description={user.email ?? "No email on file yet"}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditModalOpen(true)}>
            <i className="fas fa-pen mr-1" />
            Edit
          </button>
        }
      />

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              id={`user-view-tab-${t.key}`}
              className={`nav-link btn btn-link ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`fas ${t.icon} mr-1`} />
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "details" ? (
        <div className="card">
          <div className="card-body">
            <dl className="row mb-0">
              <dt className="col-sm-3">Name</dt>
              <dd className="col-sm-9">
                {user.name ?? "—"}
                {user.profileCompletedAt ? null : (
                  <span className="badge badge-warning ml-2">Profile incomplete</span>
                )}
              </dd>

              <dt className="col-sm-3">Email</dt>
              <dd className="col-sm-9">{user.email ?? "—"}</dd>

              <dt className="col-sm-3">Role</dt>
              <dd className="col-sm-9">
                <span className={`badge ${ROLE_BADGES[user.role] ?? "badge-secondary"}`}>{user.role}</span>
                {user.isSuperAdmin ? <span className="badge badge-dark ml-2">Super admin</span> : null}
              </dd>

              <dt className="col-sm-3">Status</dt>
              <dd className="col-sm-9">
                <span className={`badge ${user.isActive ? "badge-success" : "badge-secondary"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </dd>

              {user.phone ? (
                <>
                  <dt className="col-sm-3">Phone</dt>
                  <dd className="col-sm-9">{user.phone}</dd>
                </>
              ) : null}

              {user.businessName ? (
                <>
                  <dt className="col-sm-3">Business Name</dt>
                  <dd className="col-sm-9">{user.businessName}</dd>
                </>
              ) : null}

              {user.address ? (
                <>
                  <dt className="col-sm-3">Address</dt>
                  <dd className="col-sm-9">
                    {[user.address, user.town, user.district, user.state, user.pincode].filter(Boolean).join(", ")}
                  </dd>
                </>
              ) : null}

              <dt className="col-sm-3">Joined</dt>
              <dd className="col-sm-9">{formatDateTimeIST(user.createdAt)}</dd>
            </dl>

            <p className="text-muted small mb-0 mt-3">
              <i className="fas fa-circle-info mr-1" />
              Customer orders and payments return with the storefront.
            </p>
          </div>
        </div>
      ) : null}

      {tab === "sessions" ? (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">Active Sessions</h3>
            <button
              type="button"
              id="user-view-force-logout-btn"
              className="btn btn-sm btn-outline-danger"
              disabled={!sessionsData?.items?.length}
              onClick={() => setForceLogoutConfirmOpen(true)}
            >
              <i className="fas fa-right-from-bracket mr-1" />
              Force Logout Everywhere
            </button>
          </div>
          <div className="card-body">
            {sessionsError ? <div className="alert alert-danger">{sessionsError}</div> : null}

            {isLoadingSessions ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : isSessionsError ? (
              <div className="alert alert-danger">Could not load sessions. Please try again.</div>
            ) : (sessionsData?.items ?? []).length === 0 ? (
              <p className="text-muted mb-0">No active sessions.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Last Used</th>
                      <th>Signed In</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsData.items.map((session) => (
                      <tr key={session.id}>
                        <td>{session.deviceInfo ?? "Unknown device"}</td>
                        <td>{session.ipAddress ?? "—"}</td>
                        <td>{session.lastUsedAt ? formatDateTimeIST(session.lastUsedAt) : "—"}</td>
                        <td>{formatDateTimeIST(session.createdAt)}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setRevokingSession(session)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <UserFormModal
        open={editModalOpen}
        user={user}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={updateUser.isPending}
        serverError={formError}
      />

      <ConfirmDialog
        open={Boolean(revokingSession)}
        title="Revoke session?"
        message="This will sign that device out the next time it tries to refresh its session."
        onConfirm={handleRevokeSession}
        onCancel={() => setRevokingSession(null)}
      />

      <ConfirmDialog
        open={forceLogoutConfirmOpen}
        title="Force logout everywhere?"
        message={`This will revoke every active session for ${userDisplayName(user)}, signing them out of all devices.`}
        onConfirm={handleForceLogout}
        onCancel={() => setForceLogoutConfirmOpen(false)}
      />
    </PageWrapper>
  )
}
