import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { useCancelMyOrder, useMyOrder } from "@/features/my-orders/hooks/use-my-orders"
import { formatMoney, formatDateTimeIST } from "@/lib/format"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function MyOrderDetailPage() {
  const { id } = useParams()
  const { data: order, isLoading, isError } = useMyOrder(id)
  const cancelOrder = useCancelMyOrder()
  const [serverError, setServerError] = useState("")

  async function handleCancel() {
    setServerError("")
    try {
      await cancelOrder.mutateAsync(id)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not cancel order")
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div>
        <div className="alert alert-danger">Order not found.</div>
        <Link to={ROUTES.STORE.ORDERS}>Back to My Orders</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Order {order.orderNumber}</h2>
          <p className="text-muted mb-0">Placed {formatDateTimeIST(order.createdAt)}</p>
        </div>
        <Link to={ROUTES.STORE.ORDERS} className="btn btn-outline-secondary">
          Back to My Orders
        </Link>
      </div>

      {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

      <div className="row">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Items</h5>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="d-flex align-items-center">
                          {item.productPhotoUrl ? (
                            <img
                              src={resolveMediaUrl(item.productPhotoUrl)}
                              alt={item.productName}
                              style={{ width: 40, height: 40, objectFit: "contain" }}
                              className="mr-2"
                            />
                          ) : null}
                          {item.productName}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatMoney(item.wspAtOrder)}</td>
                        <td>{formatMoney(item.wspAtOrder * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={3} className="text-right">
                        Total
                      </th>
                      <th>{formatMoney(order.totalAmount)}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Shipping Details</h5>
              <p className="mb-1">
                {order.shippingName} · {order.shippingPhone}
              </p>
              <p className="mb-0 text-muted">
                {order.shippingAddressLine1}
                {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}, {order.shippingCity},{" "}
                {order.shippingState} - {order.shippingPincode}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Payment</h5>
              <p className="mb-1">
                Method: <strong>Bank Transfer</strong>
              </p>
              <p className="mb-1">
                Transaction ID: <strong>{order.transactionId}</strong>
              </p>
              <p className="mb-0">
                Status: <PaymentStatusBadge status={order.paymentStatus} />
              </p>
            </div>
          </div>

          {order.status === "pending" ? (
            <div className="card">
              <div className="card-body">
                <p className="text-muted small">You can cancel this order while it&apos;s still pending review.</p>
                <button
                  id="cancel-order-button"
                  type="button"
                  className="btn btn-outline-danger btn-block"
                  onClick={handleCancel}
                  disabled={cancelOrder.isPending}
                >
                  {cancelOrder.isPending ? "Cancelling…" : "Cancel Order"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
