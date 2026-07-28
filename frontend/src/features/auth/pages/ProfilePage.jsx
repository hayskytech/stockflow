import { useState } from "react"
import { Link } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuthStore } from "@/store/auth.store"
import { useMySessions, useRevokeMySession } from "@/features/auth/hooks/use-my-sessions"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

const ROLE_LABELS = { admin: "Admin", staff: "Staff", customer: "Customer" }

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { data: sessions = [], isLoading, isError } = useMySessions()
  const revokeSession = useRevokeMySession()
  const [revokingSession, setRevokingSession] = useState(null)
  const [serverError, setServerError] = useState("")

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

  return (
    <PageWrapper>
      <PageHeader title="My Profile" description="Your account details and active login sessions" />

      <div className="card mb-4">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-2">Name</dt>
            <dd className="col-sm-10">{user?.name}</dd>
            <dt className="col-sm-2">Email</dt>
            <dd className="col-sm-10">{user?.email}</dd>
            <dt className="col-sm-2">Role</dt>
            <dd className="col-sm-10">{ROLE_LABELS[user?.role] ?? user?.role}</dd>
          </dl>
        </div>
        <div className="card-footer">
          <Link id="profile-change-password-link" to={ROUTES.AUTH.CHANGE_PASSWORD} className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-key mr-1" />
            Change Password
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Active Sessions</h3>
        </div>
        <div className="card-body">
          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          {isLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : isError ? (
            <div className="alert alert-danger">Could not load sessions. Please try again.</div>
          ) : sessions.length === 0 ? (
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
                  {sessions.map((session) => (
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
