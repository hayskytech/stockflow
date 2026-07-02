import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DataTable } from "@/components/common/DataTable"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { useMyOrders } from "@/features/my-orders/hooks/use-my-orders"
import { formatMoney, formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function MyOrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useMyOrders({ page, per_page: 10 })

  const columns = [
    { key: "orderNumber", label: "Order #" },
    { key: "createdAt", label: "Placed", render: (row) => formatDateTimeIST(row.createdAt) },
    { key: "totalAmount", label: "Amount", render: (row) => formatMoney(row.totalAmount) },
    { key: "status", label: "Status", render: (row) => <OrderStatusBadge status={row.status} /> },
    { key: "paymentStatus", label: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => navigate(ROUTES.STORE.ORDER_DETAIL(row.id))}
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div>
      <h2 className="mb-4">My Orders</h2>
      <div className="card">
        <div className="card-body">
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
