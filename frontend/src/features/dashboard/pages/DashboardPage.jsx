import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"

export function DashboardPage() {
  return (
    <PageWrapper>
      <PageHeader title="Dashboard" description="Warehouse overview and key metrics" />
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>0</h3>
              <p>Products</p>
            </div>
            <i className="small-box-icon fas fa-shirt" />
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>0</h3>
              <p>Pending Orders</p>
            </div>
            <i className="small-box-icon fas fa-cart-shopping" />
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>0</h3>
              <p>Dispatches Today</p>
            </div>
            <i className="small-box-icon fas fa-truck" />
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>0</h3>
              <p>Low Stock Items</p>
            </div>
            <i className="small-box-icon fas fa-triangle-exclamation" />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
