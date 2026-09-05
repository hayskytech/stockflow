import { useParams } from "react-router-dom"
import { Link } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useDispatch } from "@/features/dispatches/hooks/use-dispatches"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function DispatchDetailPage() {
  const { id } = useParams()
  const { data: dispatch, isLoading, isError } = useDispatch(id)

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isError || !dispatch) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Dispatch not found.</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={`Dispatch ${dispatch.dispatchNumber}`}
        description={`Dispatched ${formatDateTimeIST(dispatch.createdAt)} by ${dispatch.dispatchedByName}`}
      />

      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Details</h5>
              <dl className="mb-0">
                <dt>Order</dt>
                <dd>
                  <Link to={ROUTES.ORDERS.DETAIL(dispatch.orderId)} id="dispatch-order-link">
                    {dispatch.orderNumber}
                  </Link>
                </dd>
                <dt>Ship to</dt>
                <dd>{dispatch.shippingName}</dd>
                <dt>Courier</dt>
                <dd>{dispatch.courierName ?? <span className="text-muted">—</span>}</dd>
                <dt>AWB / tracking</dt>
                <dd>{dispatch.awbNumber ?? <span className="text-muted">—</span>}</dd>
                {dispatch.note ? (
                  <>
                    <dt>Note</dt>
                    <dd>{dispatch.note}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                Products dispatched <span className="badge badge-primary">{dispatch.items.length}</span>
              </h5>
              <div className="table-responsive">
                <table className="table table-sm" id="dispatch-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Code</th>
                      <th className="text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatch.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td className="text-muted">{item.productCode}</td>
                        <td className="text-right">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
