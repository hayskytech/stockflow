import { useState } from "react"
import { Link } from "react-router-dom"
import { DataTable } from "@/components/common/DataTable"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { BackorderBadge } from "@/components/ui/BackorderBadge"
import { useMyOrders } from "@/features/my-orders/hooks/use-my-orders"
import { formatMoney, formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function MyOrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const { data, isLoading, isError } = useMyOrders({ page, per_page: 10, search: search || undefined })

  const columns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (row) => <Link to={ROUTES.STORE.ORDER_DETAIL(row.id)}>{row.orderNumber}</Link>,
    },
    { key: "createdAt", label: "Placed", render: (row) => formatDateTimeIST(row.createdAt) },
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
    { key: "paymentStatus", label: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
  ]

  return (
    <div>
      <h2 className="mb-4">My Orders{typeof data?.total === "number" ? ` (${data.total})` : ""}</h2>
      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                id="my-orders-search"
                type="search"
                className="form-control"
                placeholder="Search by order #…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-cart-shopping"
            emptyTitle="No orders yet"
            emptyDescription="Your placed orders will show up here."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
