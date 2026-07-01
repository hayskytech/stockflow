import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"

export function OrdersPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Orders"
        description="Orders placed against the warehouse"
        actions={
          <button type="button" className="btn btn-primary">
            <i className="fas fa-plus mr-1" />
            New Order
          </button>
        }
      />
      <div className="card">
        <div className="card-body">
          <EmptyState icon="fa-cart-shopping" title="No orders yet" />
        </div>
      </div>
    </PageWrapper>
  )
}
