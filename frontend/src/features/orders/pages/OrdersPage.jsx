import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { useOrdersStore } from "@/features/orders/orders.store"
import { useOrders, useUpdateOrderStatus } from "@/features/orders/hooks/use-orders"
import { formatMoney, formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

const STATUS_OPTIONS = ["pending", "accepted", "rejected", "dispatched", "completed", "cancelled"]

export function OrdersPage() {
  const navigate = useNavigate()

  const statusFilter = useOrdersStore((s) => s.statusFilter)
  const setStatusFilter = useOrdersStore((s) => s.setStatusFilter)
  const dateFrom = useOrdersStore((s) => s.dateFrom)
  const setDateFrom = useOrdersStore((s) => s.setDateFrom)
  const dateTo = useOrdersStore((s) => s.dateTo)
  const setDateTo = useOrdersStore((s) => s.setDateTo)

  const [page, setPage] = useState(1)
  const [serverError, setServerError] = useState("")

  const { data, isLoading, isError } = useOrders({
    page,
    per_page: 10,
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  })

  const updateOrderStatus = useUpdateOrderStatus()

  async function handleStatusChange(id, status) {
    setServerError("")
    try {
      await updateOrderStatus.mutateAsync({ id, status })
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not update order")
    }
  }

  const columns = [
    { key: "orderNumber", label: "Order #" },
    {
      key: "requestedByName",
      label: "Customer",
      render: (row) => (
        <>
          <div>{row.requestedByName}</div>
          <div className="text-muted small">{row.requestedByEmail}</div>
        </>
      ),
    },
    { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
    { key: "status", label: "Status", render: (row) => <OrderStatusBadge status={row.status} /> },
    { key: "paymentStatus", label: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
    { key: "createdAt", label: "Placed", render: (row) => formatDateTimeIST(row.createdAt) },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mr-2"
            onClick={() => navigate(ROUTES.ORDERS.DETAIL(row.id))}
          >
            View
          </button>
          {row.status === "pending" ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-success mr-2"
                onClick={() => handleStatusChange(row.id, "accepted")}
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleStatusChange(row.id, "rejected")}
              >
                Reject
              </button>
            </>
          ) : null}
        </>
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader title="Orders" description="Orders placed against the warehouse" />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <select
                id="orders-status-filter"
                className="form-control"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <input
                id="orders-date-from"
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-4">
              <input
                id="orders-date-to"
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-cart-shopping"
            emptyTitle="No orders yet"
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
