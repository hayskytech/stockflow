import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { UserFormModal } from "@/features/users/components/UserFormModal"
import { useUserDetail } from "@/features/users/hooks/use-user-detail"
import { useUserOrders } from "@/features/users/hooks/use-user-orders"
import { useUpdateUser } from "@/features/users/hooks/use-users"
import { useAdminSessions, useForceLogoutUser, useRevokeAnySession } from "@/features/users/hooks/use-admin-sessions"
import { formatDateTimeIST } from "@/lib/format"
import { userDisplayName } from "@/lib/user"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { useAuthStore } from "@/store/auth.store"
import { ROUTES } from "@/constants/routes"
import { ROLES } from "@/constants/app"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
  customer: "badge-secondary",
}

const BASE_TABS = [
  { key: "details", label: "Details", icon: "fa-id-card" },
  { key: "orders", label: "Orders", icon: "fa-cart-shopping" },
  { key: "payments", label: "Payments", icon: "fa-money-bill" },
]

// Sessions tab is admin-only — mirrors the backend's requireRole('admin') on the /admin/*
// session endpoints (see permission matrix: "View/terminate sessions — others" is Admin only).
const SESSIONS_TAB = { key: "sessions", label: "Sessions", icon: "fa-desktop" }

export function UserViewPage() {
  const { id } = useParams()
  const formatMoney = useFormatMoney()
  const isAdmin = useAuthStore((s) => s.user?.role === ROLES.ADMIN)

  const [tab, setTab] = useState("details")
  const [page, setPage] = useState(1)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formError, setFormError] = useState("")
  const [revokingSession, setRevokingSession] = useState(null)
  const [forceLogoutConfirmOpen, setForceLogoutConfirmOpen] = useState(false)
  const [sessionsError, setSessionsError] = useState("")

  const { data: user, isLoading, isError } = useUserDetail(id)
  const { data: ordersData, isLoading: isLoadingOrders } = useUserOrders(
    id,
    { page, per_page: 10 },
  )
  const { data: sessionsData, isLoading: isLoadingSessions, isError: isSessionsError } = useAdminSessions(
    { user_id: id },
    { enabled: isAdmin && tab === "sessions" },
  )
  const updateUser = useUpdateUser()
  const revokeSession = useRevokeAnySession()
  const forceLogout = useForceLogoutUser()

  const tabs = isAdmin ? [...BASE_TABS, SESSIONS_TAB] : BASE_TABS

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

  const orderColumns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (row) => <Link to={ROUTES.ORDERS.DETAIL(row.id)}>{row.orderNumber}</Link>,
    },
    { key: "createdAt", label: "Placed", render: (row) => formatDateTimeIST(row.createdAt) },
    { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
    { key: "status", label: "Status", render: (row) => <OrderStatusBadge status={row.status} /> },
  ]

  const paymentColumns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (row) => <Link to={ROUTES.ORDERS.DETAIL(row.id)}>{row.orderNumber}</Link>,
    },
    { key: "paymentMethod", label: "Method" },
    { key: "transactionId", label: "Transaction ID", render: (row) => row.transactionId ?? "—" },
    { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
    {
      key: "paymentStatus",
      label: "Payment Status",
      render: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
    },
  ]

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
        {tabs.map((t) => (
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
                {/* Not a data error: OTP sign-in creates the account from a verified phone alone,
                    and the customer fills the rest in afterwards. */}
                {user.profileCompletedAt ? null : (
                  <span className="badge badge-warning ml-2">Profile incomplete</span>
                )}
              </dd>

              <dt className="col-sm-3">Email</dt>
              <dd className="col-sm-9">{user.email ?? "—"}</dd>

              <dt className="col-sm-3">Role</dt>
              <dd className="col-sm-9">
                <span className={`badge ${ROLE_BADGES[user.role] ?? "badge-secondary"}`}>{user.role}</span>
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
          </div>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="card">
          <div className="card-body">
            <DataTable
              columns={orderColumns}
              rows={ordersData?.items ?? []}
              isLoading={isLoadingOrders}
              emptyIcon="fa-cart-shopping"
              emptyTitle="No orders yet"
              emptyDescription="Orders placed by this user will show up here."
              page={page}
              totalPages={ordersData?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="card">
          <div className="card-body">
            <DataTable
              columns={paymentColumns}
              rows={ordersData?.items ?? []}
              isLoading={isLoadingOrders}
              emptyIcon="fa-money-bill"
              emptyTitle="No payments yet"
              emptyDescription="Payments for this user's orders will show up here."
              page={page}
              totalPages={ordersData?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}

      {tab === "sessions" && isAdmin ? (
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
