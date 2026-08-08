import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { UserFormModal } from "@/features/users/components/UserFormModal"
import { useUserDetail } from "@/features/users/hooks/use-user-detail"
import { useUserOrders } from "@/features/users/hooks/use-user-orders"
import { useUpdateUser } from "@/features/users/hooks/use-users"
import { formatDateTimeIST } from "@/lib/format"
import { userDisplayName } from "@/lib/user"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
  customer: "badge-secondary",
}

const TABS = [
  { key: "details", label: "Details", icon: "fa-id-card" },
  { key: "orders", label: "Orders", icon: "fa-cart-shopping" },
  { key: "payments", label: "Payments", icon: "fa-money-bill" },
]

export function UserViewPage() {
  const { id } = useParams()
  const formatMoney = useFormatMoney()

  const [tab, setTab] = useState("details")
  const [page, setPage] = useState(1)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formError, setFormError] = useState("")

  const { data: user, isLoading, isError } = useUserDetail(id)
  const { data: ordersData, isLoading: isLoadingOrders } = useUserOrders(
    id,
    { page, per_page: 10 },
  )
  const updateUser = useUpdateUser()

  async function handleEditSubmit(input) {
    setFormError("")
    try {
      await updateUser.mutateAsync({ id, input })
      setEditModalOpen(false)
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Could not save user")
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

      <UserFormModal
        open={editModalOpen}
        user={user}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={updateUser.isPending}
        serverError={formError}
      />
    </PageWrapper>
  )
}
