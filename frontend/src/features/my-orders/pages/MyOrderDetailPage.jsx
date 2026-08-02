import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { BackorderBadge } from "@/components/ui/BackorderBadge"
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
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4">
        <div className="mb-2 mb-sm-0">
          <h2 className="mb-0">Order {order.orderNumber}</h2>
          <p className="text-muted mb-0">Placed {formatDateTimeIST(order.createdAt)}</p>
        </div>
        <Link to={ROUTES.STORE.ORDERS} className="btn btn-outline-secondary">
          Back to My Orders
        </Link>
      </div>

      {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

      {order.isBackorder && order.status === "pending" ? (
        <div className="alert alert-warning" id="my-order-backorder-banner">
          <i className="fas fa-clock mr-2" />
          <strong>Back-order — awaiting restock.</strong> One or more items weren&apos;t in stock when you placed
          this order. We&apos;ll accept it as soon as stock is available.
        </div>
      ) : null}

      <div className="row">
        <div className="col-12 col-md-8">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title float-none mb-0">Items</h5>
                <div>
                  <OrderStatusBadge status={order.status} />
                  {order.isBackorder ? (
                    <span className="ml-2">
                      <BackorderBadge />
                    </span>
                  ) : null}
                </div>
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
                          <div
                            className="d-flex align-items-center justify-content-center bg-light rounded mr-2"
                            style={{ width: 40, height: 40, flexShrink: 0 }}
                          >
                            {item.productPhotoUrl ? (
                              <img
                                src={resolveMediaUrl(item.productPhotoUrl)}
                                alt={item.productName}
                                style={{ width: 40, height: 40, objectFit: "contain" }}
                              />
                            ) : (
                              <i className="fas fa-shirt text-muted" />
                            )}
                          </div>
                          {item.productName}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatMoney(item.effectivePriceAtOrder)}</td>
                        <td>{formatMoney(item.effectivePriceAtOrder * item.quantity)}</td>
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
              <h5 className="card-title float-none">Shipping Details</h5>
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

        <div className="col-12 col-md-4 mt-4 mt-md-0">
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title float-none">Payment</h5>
              <p className="mb-1">
                Method: <strong>{order.paymentMethod === "offline" ? "Offline (settled outside the app)" : "Bank Transfer"}</strong>
              </p>
              {order.paymentMethod !== "offline" ? (
                <p className="mb-1">
                  Transaction ID: <strong>{order.transactionId ?? "—"}</strong>
                </p>
              ) : null}
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
