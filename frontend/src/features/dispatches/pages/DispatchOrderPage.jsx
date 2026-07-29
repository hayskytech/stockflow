import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ROUTES } from "@/constants/routes"
import { dispatchDetailsSchema } from "@/features/dispatches/dispatches.schema"
import { useCreateDispatch, useDispatchOrder } from "@/features/dispatches/hooks/use-dispatches"

export function DispatchOrderPage() {
  const { id: orderId } = useParams()
  const { data: order, isLoading, isError } = useDispatchOrder(orderId)

  const createDispatch = useCreateDispatch()

  const [serverError, setServerError] = useState("")
  const [result, setResult] = useState(null)

  const form = useForm({
    defaultValues: { courierName: "", awbNumber: "", note: "" },
    validators: { onSubmit: dispatchDetailsSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const data = await createDispatch.mutateAsync({
          orderId,
          courierName: value.courierName.trim() || undefined,
          awbNumber: value.awbNumber.trim() || undefined,
          note: value.note.trim() || undefined,
        })
        setResult(data)
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Dispatch failed — nothing was saved")
      }
    },
  })

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

  if (result) {
    return (
      <PageWrapper>
        <PageHeader title={`Dispatch ${result.dispatchNumber}`} description={`Order ${order.orderNumber} dispatched`} />
        <div className="alert alert-success" id="dispatch-success">
          Dispatched {result.items.length} line{result.items.length === 1 ? "" : "s"} against order{" "}
          <strong>{order.orderNumber}</strong>.
        </div>
        <Link to={ROUTES.DISPATCHES.DETAIL(result.id)} id="dispatch-view-button" className="btn btn-primary mr-2">
          View dispatch
        </Link>
        <Link to={ROUTES.ORDERS.DETAIL(orderId)} className="btn btn-outline-secondary">
          Back to order
        </Link>
      </PageWrapper>
    )
  }

  if (order.status !== "accepted") {
    return (
      <PageWrapper>
        <PageHeader title={`Dispatch order ${order.orderNumber}`} />
        <div className="alert alert-warning" id="dispatch-wrong-status">
          This order is <strong>{order.status}</strong> — only accepted orders can be dispatched.
        </div>
        <Link to={ROUTES.ORDERS.DETAIL(orderId)} className="btn btn-outline-secondary">
          Back to order
        </Link>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={`Dispatch order ${order.orderNumber}`}
        description="Confirm the order's contents and courier details, then dispatch"
        actions={
          <Link to={ROUTES.ORDERS.DETAIL(orderId)} id="dispatch-back-button" className="btn btn-outline-secondary">
            <i className="fas fa-arrow-left mr-1" />
            Back to order
          </Link>
        }
      />

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">Order contents</div>
            <div className="card-body p-0">
              <table className="table mb-0" id="dispatch-order-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.productName}
                        <div className="text-muted small">{item.productCode}</div>
                      </td>
                      <td className="text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">Courier details (optional)</div>
            <div className="card-body">
              <form
                id="dispatch-details-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <form.Field name="courierName">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="dispatch-courier-name">Courier</label>
                      <input
                        id="dispatch-courier-name"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                <form.Field name="awbNumber">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="dispatch-awb-number">AWB / tracking number</label>
                      <input
                        id="dispatch-awb-number"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                <form.Field name="note">
                  {(field) => (
                    <div className="form-group mb-0">
                      <label htmlFor="dispatch-note">Note</label>
                      <textarea
                        id="dispatch-note"
                        className="form-control"
                        rows={2}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </form>

              {serverError ? (
                <div className="alert alert-danger py-2 mt-3 mb-0" id="dispatch-server-error">
                  {serverError}
                </div>
              ) : null}

              <button
                type="submit"
                form="dispatch-details-form"
                id="dispatch-submit-button"
                className="btn btn-success mt-3"
                disabled={createDispatch.isPending}
              >
                {createDispatch.isPending ? (
                  "Dispatching…"
                ) : (
                  <>
                    <i className="fas fa-truck mr-1" />
                    Confirm Dispatch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
