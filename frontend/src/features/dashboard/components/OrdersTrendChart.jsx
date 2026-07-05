import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" })

/** Short "05 Jul" label — dailyOrders dates are already date-only calendar buckets, not timestamps,
 *  so no UTC->IST conversion applies here (unlike the shared date helper, which is for datetimes). */
function formatAxisDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number)
  return DAY_MONTH_FORMATTER.format(new Date(year, month - 1, day))
}

/** Line/area trend of daily order counts over the requested window. */
export function OrdersTrendChart({ data }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title float-none">Orders Trend</h3>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ordersTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007bff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#007bff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatAxisDate} fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip labelFormatter={formatAxisDate} formatter={(value) => [value, "Orders"]} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#007bff"
              strokeWidth={2}
              fill="url(#ordersTrendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
