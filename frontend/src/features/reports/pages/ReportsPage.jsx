import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useStockMovement } from "@/features/reports/hooks/use-reports"
import { formatDateIST } from "@/lib/format"

const DAY_OPTIONS = [7, 14, 30, 90]

export function ReportsPage() {
  const [days, setDays] = useState(14)
  const { data: movement, isLoading } = useStockMovement(days)

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
    </PageWrapper>
  )
}
