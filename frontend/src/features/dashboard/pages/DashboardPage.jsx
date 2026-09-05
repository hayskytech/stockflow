import { Link } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import {
  useOrderHistory,
  useStaffCount,
  useStockMovement,
  useStockSummary,
} from "@/features/dashboard/hooks/use-dashboard"
import { OrdersByStatusChart } from "@/features/dashboard/components/OrdersByStatusChart"
import { OrdersTrendChart } from "@/features/dashboard/components/OrdersTrendChart"
import { LowStockTable } from "@/features/dashboard/components/LowStockTable"
import { useFormatMoney } from "@/hooks/use-business-settings"
import { useAuthStore } from "@/store/auth.store"
import { ROLES } from "@/constants/app"
import { ROUTES } from "@/constants/routes"

export function DashboardPage() {
  const formatMoney = useFormatMoney()
  const isAdmin = useAuthStore((s) => s.user?.role === ROLES.ADMIN)
  const { data: stockSummary, isLoading: isLoadingStock, isError: isStockError } = useStockSummary()
  const { data: orderHistory, isLoading: isLoadingOrders, isError: isOrdersError } = useOrderHistory(14)
  const { data: stockMovement, isLoading: isLoadingMovement, isError: isMovementError } = useStockMovement(14)
  const { data: staffCount, isLoading: isLoadingStaff, isError: isStaffError } = useStaffCount({ enabled: isAdmin })

  const isLoading = isLoadingStock || isLoadingOrders || isLoadingMovement || (isAdmin && isLoadingStaff)
  const isError = isStockError || isOrdersError || isMovementError || (isAdmin && isStaffError)

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
              <Link to={ROUTES.PRODUCTS.LIST} className="card stat-card text-decoration-none text-dark d-block">
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
              </Link>
            </div>
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.ORDERS.LIST} className="card stat-card text-decoration-none text-dark d-block">
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
              </Link>
            </div>
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.DISPATCHES.LIST} className="card stat-card text-decoration-none text-dark d-block">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-warning-subtle text-warning">
                    <i className="fas fa-truck" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Dispatches</span>
                    <h3 id="dashboard-dispatches-today-count" className="stat-card-value">
                      {orderHistory.dispatchesToday}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.REPORTS} className="card stat-card text-decoration-none text-dark d-block">
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
              </Link>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.ORDERS.LIST} className="card stat-card text-decoration-none text-dark d-block">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-primary-subtle text-primary">
                    <i className="fas fa-clipboard-check" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Accepted Orders</span>
                    <h3 id="dashboard-accepted-orders-count" className="stat-card-value">
                      {orderHistory.byStatus.accepted}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.ORDERS.LIST} className="card stat-card text-decoration-none text-dark d-block">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-secondary-subtle text-secondary">
                    <i className="fas fa-flag-checkered" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Completed Orders</span>
                    <h3 id="dashboard-completed-orders-count" className="stat-card-value">
                      {orderHistory.byStatus.completed}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-3 col-6">
              <Link to={ROUTES.STOCK.LIST} className="card stat-card text-decoration-none text-dark d-block">
                <div className="card-body d-flex align-items-center">
                  <div className="stat-card-icon bg-dark-subtle text-dark">
                    <i className="fas fa-lock" />
                  </div>
                  <div className="stat-card-text">
                    <span className="stat-card-label">Reserved Units</span>
                    <h3 id="dashboard-reserved-units-count" className="stat-card-value">
                      {stockMovement.reservedUnits}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
            {isAdmin ? (
              <div className="col-lg-3 col-6">
                <Link to={ROUTES.USERS.LIST} className="card stat-card text-decoration-none text-dark d-block">
                  <div className="card-body d-flex align-items-center">
                    <div className="stat-card-icon bg-info-subtle text-info">
                      <i className="fas fa-users" />
                    </div>
                    <div className="stat-card-text">
                      <span className="stat-card-label">Staff &amp; Admins</span>
                      <h3 id="dashboard-staff-count" className="stat-card-value">
                        {staffCount}
                      </h3>
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}
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
            <div className="col-12">
              <LowStockTable items={stockSummary.lowStockItems} />
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
