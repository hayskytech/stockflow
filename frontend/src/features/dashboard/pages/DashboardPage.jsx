import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useOrderHistory, useStockSummary } from "@/features/dashboard/hooks/use-dashboard"
import { OrdersByStatusChart } from "@/features/dashboard/components/OrdersByStatusChart"
import { OrdersTrendChart } from "@/features/dashboard/components/OrdersTrendChart"
import { StockByDivisionChart } from "@/features/dashboard/components/StockByDivisionChart"
import { LowStockTable } from "@/features/dashboard/components/LowStockTable"
import { formatMoney } from "@/lib/format"

export function DashboardPage() {
  const { data: stockSummary, isLoading: isLoadingStock, isError: isStockError } = useStockSummary()
  const { data: orderHistory, isLoading: isLoadingOrders, isError: isOrdersError } = useOrderHistory(14)

  const isLoading = isLoadingStock || isLoadingOrders
  const isError = isStockError || isOrdersError

  return (
    <PageWrapper>
      <PageHeader title="Dashboard" description="Warehouse overview and key metrics" />

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger">Could not load dashboard data. Please try again.</div>
      ) : (
        <>
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="card stat-card">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-info-subtle text-info">
                    <i className="fas fa-shirt" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Products</span>
                    <h3 id="dashboard-products-count" className="stat-card-value">
                      {stockSummary.activeProducts}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="card stat-card">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-success-subtle text-success">
                    <i className="fas fa-cart-shopping" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Pending Orders</span>
                    <h3 id="dashboard-pending-orders-count" className="stat-card-value">
                      {orderHistory.byStatus.pending}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="card stat-card">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-warning-subtle text-warning">
                    <i className="fas fa-truck" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Dispatches Today</span>
                    <h3 id="dashboard-dispatches-today-count" className="stat-card-value">
                      {orderHistory.dispatchesToday}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="card stat-card">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-danger-subtle text-danger">
                    <i className="fas fa-triangle-exclamation" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Low Stock Items</span>
                    <h3 id="dashboard-low-stock-count" className="stat-card-value">
                      {stockSummary.lowStockCount}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="info-box">
                <span className="info-box-icon bg-primary"><i className="fas fa-sack-dollar" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Total Order Value</span>
                  <span className="info-box-number" id="dashboard-total-order-value">
                    {formatMoney(orderHistory.totalOrderValue)}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="info-box">
                <span className="info-box-icon bg-secondary"><i className="fas fa-receipt" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Total Orders</span>
                  <span className="info-box-number" id="dashboard-total-orders">{orderHistory.totalOrders}</span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="info-box">
                <span className="info-box-icon bg-dark"><i className="fas fa-boxes-stacked" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Units in Stock</span>
                  <span className="info-box-number" id="dashboard-units-in-stock">
                    {stockSummary.totalQuantityAvailable}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8">
              <OrdersTrendChart data={orderHistory.dailyOrders} />
            </div>
            <div className="col-md-4">
              <OrdersByStatusChart byStatus={orderHistory.byStatus} />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <StockByDivisionChart byDivision={stockSummary.byDivision} />
            </div>
            <div className="col-md-8">
              <LowStockTable items={stockSummary.lowStockItems} />
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
