import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { BackorderBadge } from "@/components/ui/BackorderBadge"
import { useOrdersStore } from "@/features/orders/orders.store"
import { useOrders, useUpdateOrderStatus } from "@/features/orders/hooks/use-orders"
import { formatDateTimeIST } from "@/lib/format"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

const STATUS_OPTIONS = ["pending", "accepted", "rejected", "dispatched", "completed", "cancelled"]

export function OrdersPage() {
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()

  const search = useOrdersStore((s) => s.search)
  const setSearch = useOrdersStore((s) => s.setSearch)
  const statusFilter = useOrdersStore((s) => s.statusFilter)
  const setStatusFilter = useOrdersStore((s) => s.setStatusFilter)
  const backorderFilter = useOrdersStore((s) => s.backorderFilter)
  const setBackorderFilter = useOrdersStore((s) => s.setBackorderFilter)
  const dateFrom = useOrdersStore((s) => s.dateFrom)
  const setDateFrom = useOrdersStore((s) => s.setDateFrom)
  const dateTo = useOrdersStore((s) => s.dateTo)
  const setDateTo = useOrdersStore((s) => s.setDateTo)

  const [page, setPage] = useState(1)
  const [serverError, setServerError] = useState("")

  const { data, isLoading, isError } = useOrders({
    page,
    per_page: 10,
    search: search || undefined,
    status: statusFilter || undefined,
    is_backorder: backorderFilter ? "true" : undefined,
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
    {
      key: "orderNumber",
      label: "Order #",
      render: (row) => <Link to={ROUTES.ORDERS.DETAIL(row.id)}>{row.orderNumber}</Link>,
    },
    {
      key: "requestedByName",
      label: "Customer",
      hideable: true,
      render: (row) => (
        <>
          <div>{row.requestedByName}</div>
          <div className="text-muted small">{row.requestedByEmail}</div>
        </>
      ),
    },
    { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <>
          <OrderStatusBadge status={row.status} />
          {row.isBackorder ? (
            <div className="mt-1">
              <BackorderBadge />
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment",
      hideable: true,
      render: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
    },
    { key: "createdAt", label: "Placed", hideable: true, render: (row) => formatDateTimeIST(row.createdAt) },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <RowActionsMenu
          actions={[
            row.status === "pending" && {
              key: "accept",
              label: "Accept",
              icon: "fa-check",
              onClick: () => handleStatusChange(row.id, "accepted"),
            },
            row.status === "pending" && {
              key: "reject",
              label: "Reject",
              icon: "fa-xmark",
              variant: "danger",
              onClick: () => handleStatusChange(row.id, "rejected"),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Orders"
        count={data?.total}
        description="Orders placed against the warehouse"
        actions={
          <button
            type="button"
            id="orders-new-button"
            className="btn btn-primary"
            onClick={() => navigate(ROUTES.ORDERS.NEW)}
          >
            <i className="fas fa-plus mr-1" />
            New Order
          </button>
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <input
                id="orders-search"
                type="search"
                className="form-control"
                placeholder="Search by order #, customer name, or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
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
            <div className="col-md-3">
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

          <div className="mb-3">
            <button
              type="button"
              id="orders-backorder-filter-chip"
              className={`btn btn-sm ${backorderFilter ? "btn-warning" : "btn-outline-warning"}`}
              onClick={() => {
                setBackorderFilter(!backorderFilter)
                setPage(1)
              }}
            >
              <i className="fas fa-clock mr-1" />
              Back-orders only
            </button>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            tableKey="orders"
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
