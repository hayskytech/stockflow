import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

const STATUS_COLORS = {
  pending: "#ffc107",
  accepted: "#17a2b8",
  dispatched: "#007bff",
  completed: "#28a745",
  rejected: "#dc3545",
  cancelled: "#6c757d",
}

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  dispatched: "Dispatched",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

/** Donut chart of order counts by lifecycle status. Statuses with zero orders are omitted. */
export function OrdersByStatusChart({ byStatus }) {
  const data = Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, count, label: STATUS_LABELS[status] }))

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title float-none">Orders by Status</h3>
      </div>
      <div className="card-body">
        {data.length === 0 ? (
          <p className="text-muted text-center mb-0 py-5">No orders yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="label" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
