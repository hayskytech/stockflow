import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge"
import { BackorderBadge } from "@/components/ui/BackorderBadge"
import { useOrder, useUpdateOrderStatus, useUpdatePaymentStatus } from "@/features/orders/hooks/use-orders"
import { formatDateTimeIST } from "@/lib/format"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function OrderDetailPage() {
  const { id } = useParams()
  const formatMoney = useFormatMoney()
  const { data: order, isLoading, isError } = useOrder(id)
  const updateOrderStatus = useUpdateOrderStatus()
  const updatePaymentStatus = useUpdatePaymentStatus()
  const [serverError, setServerError] = useState("")

  async function handleStatusChange(status) {
    setServerError("")
    try {
      await updateOrderStatus.mutateAsync({ id, status })
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not update order")
    }
  }

  async function handlePaymentStatusChange(paymentStatus) {
    setServerError("")
    try {
      await updatePaymentStatus.mutateAsync({ id, paymentStatus })
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not update payment status")
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

  if (isError || !order) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Order not found.</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDateTimeIST(order.createdAt)} by ${order.requestedByName}`}
      />

      {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

      {order.isBackorder && order.status === "pending" ? (
        <div className="alert alert-warning" id="order-backorder-banner">
          <i className="fas fa-clock mr-2" />
          <strong>Back-order — awaiting restock.</strong> At least one item didn&apos;t have enough stock when this
          order was placed. Accepting will re-check stock and succeed once it's available.
        </div>
      ) : null}

      <div className="row">
        <div className="col-md-8">
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
                      <th>Line Total</th>
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
                          <div>
                            <div>{item.productName}</div>
                            <div className="text-muted small">{item.productCode}</div>
                          </div>
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
              {order.notes ? (
                <p className="text-muted small mb-0">
                  <strong>Notes:</strong> {order.notes}
                </p>
              ) : null}
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

        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title float-none">Payment</h5>
              <p className="mb-1">
                Method: <strong>{order.paymentMethod === "offline" ? "Offline (settled outside the app)" : "Bank Transfer"}</strong>
              </p>
              {order.paymentMethod !== "offline" ? (
                <p className="mb-1 d-flex align-items-center">
                  Transaction ID:{" "}
                  <strong id="order-transaction-id" className="ml-1">
                    {order.transactionId ?? "—"}
                  </strong>
                  {order.transactionId ? (
                    <button
                      type="button"
                      id="copy-transaction-id"
                      className="btn btn-sm btn-link py-0"
                      title="Copy transaction ID"
                      onClick={() => navigator.clipboard.writeText(order.transactionId)}
                    >
                      <i className="fas fa-copy" />
                    </button>
                  ) : null}
                </p>
              ) : null}
              <p className="mb-2">
                Status: <PaymentStatusBadge status={order.paymentStatus} />
              </p>

              {order.duplicateTransactionCount > 0 ? (
                <div className="alert alert-warning py-2 small">
                  <i className="fas fa-triangle-exclamation mr-1" />
                  This transaction ID appears on {order.duplicateTransactionCount} other order
                  {order.duplicateTransactionCount > 1 ? "s" : ""} — verify carefully before confirming payment.
                </div>
              ) : null}

              {order.paymentStatus === "pending" && order.status !== "cancelled" && order.status !== "rejected" ? (
                <div className="d-flex">
                  <button
                    type="button"
                    className="btn btn-sm btn-success mr-2"
                    onClick={() => handlePaymentStatusChange("verified")}
                  >
                    Mark Verified
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handlePaymentStatusChange("rejected")}
                  >
                    Reject Payment
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title float-none">Order Actions</h5>
              {order.status === "pending" ? (
                <div className="d-flex flex-column">
                  {order.paymentStatus === "rejected" ? (
                    <p className="text-danger small">
                      Payment was rejected — this order can&apos;t be accepted until that&apos;s resolved.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-success mb-2"
                    disabled={order.paymentStatus === "rejected"}
                    onClick={() => handleStatusChange("accepted")}
                  >
                    Accept Order
                  </button>
                  <button type="button" className="btn btn-outline-danger mb-2" onClick={() => handleStatusChange("rejected")}>
                    Reject Order
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => handleStatusChange("cancelled")}>
                    Cancel Order
                  </button>
                </div>
              ) : order.status === "accepted" ? (
                <>
                  <Link
                    to={ROUTES.ORDERS.DISPATCH(order.id)}
                    id="order-dispatch-button"
                    className="btn btn-primary btn-block"
                  >
                    <i className="fas fa-truck mr-1" />
                    Dispatch — scan items
                  </Link>
                  <p className="text-muted small mb-0">
                    Each physical unit is scan-verified before the order leaves the warehouse.
                  </p>
                </>
              ) : order.status === "dispatched" ? (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleStatusChange("completed")}
                >
                  Mark as Completed
                </button>
              ) : (
                <p className="text-muted mb-0">
                  This order is <OrderStatusBadge status={order.status} /> — no further status changes available here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
