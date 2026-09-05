import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useMonthlyOrderSummary, useStockMovement } from "@/features/reports/hooks/use-reports"
import { useFormatMoney } from "@/hooks/use-business-settings"
import { formatDateIST } from "@/lib/format"

const DAY_OPTIONS = [7, 14, 30, 90]
const MONTH_OPTIONS = [6, 12, 24]

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" })

/** "2026-07" -> "Jul 2026" — monthlyOrders keys are already date-only calendar buckets. */
function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number)
  return MONTH_FORMATTER.format(new Date(year, month - 1, 1))
}

export function ReportsPage() {
  const [days, setDays] = useState(14)
  const [months, setMonths] = useState(6)
  const { data: movement, isLoading } = useStockMovement(days)
  const { data: monthlySummary, isLoading: isLoadingMonthly } = useMonthlyOrderSummary(months)
  const formatMoney = useFormatMoney()

  return (
    <PageWrapper>
      <PageHeader title="Reports" description="Warehouse stock movement — what came in, what went out, what's left" />

      <div className="row">
        <div className="col-md-3">
          <div className="small-box bg-info">
            <div className="inner">
              <h3 id="report-available-units">{movement?.availableUnits ?? "—"}</h3>
              <p>Units in stock</p>
            </div>
            <div className="icon">
              <i className="fas fa-boxes-stacked" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3 id="report-reserved-units">{movement?.reservedUnits ?? "—"}</h3>
              <p>Units reserved for orders</p>
            </div>
            <div className="icon">
              <i className="fas fa-hand-holding" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="small-box bg-success">
            <div className="inner">
              <h3 id="report-total-in">{movement?.totalIn ?? "—"}</h3>
              <p>Received (last {days} days)</p>
            </div>
            <div className="icon">
              <i className="fas fa-arrow-down" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3 id="report-total-out">{movement?.totalOut ?? "—"}</h3>
              <p>Dispatched (last {days} days)</p>
            </div>
            <div className="icon">
              <i className="fas fa-arrow-up" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title float-none mb-0">Daily Stock Movement</h3>
          <select
            id="report-movement-days"
            className="form-control form-control-sm w-auto"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <table className="table mb-0" id="report-movement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right text-success">In</th>
                  <th className="text-right text-danger">Out</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {(movement?.dailyMovement ?? [])
                  .slice()
                  .reverse()
                  .map((day) => (
                    <tr key={day.date}>
                      <td>{formatDateIST(day.date)}</td>
                      <td className="text-right text-success">{day.inQty > 0 ? `+${day.inQty}` : "—"}</td>
                      <td className="text-right text-danger">{day.outQty > 0 ? `-${day.outQty}` : "—"}</td>
                      <td className="text-right">{day.inQty - day.outQty}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title float-none mb-0">Monthly Orders</h3>
          <select
            id="report-monthly-months"
            className="form-control form-control-sm w-auto"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} months
              </option>
            ))}
          </select>
        </div>
        <div className="card-body">
          {isLoadingMonthly ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <>
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-secondary"><i className="fas fa-receipt" /></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Total Orders</span>
                      <span className="info-box-number" id="report-monthly-total-orders">
                        {monthlySummary.totalOrders}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-primary"><i className="fas fa-sack-dollar" /></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Total Amount Purchased</span>
                      <span className="info-box-number" id="report-monthly-total-amount">
                        {formatMoney(monthlySummary.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlySummary.monthlyOrders} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip labelFormatter={formatMonthLabel} formatter={(value) => [value, "Orders"]} />
                  <Bar dataKey="count" fill="#007bff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <table className="table mt-3 mb-0" id="report-monthly-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Orders</th>
                    <th className="text-right">Amount Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.monthlyOrders
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.month}>
                        <td>{formatMonthLabel(row.month)}</td>
                        <td className="text-right">{row.count}</td>
                        <td className="text-right">{formatMoney(row.revenue)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
