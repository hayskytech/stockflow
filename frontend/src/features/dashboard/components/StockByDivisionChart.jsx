import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

/** Bar chart of available stock quantity per division. */
export function StockByDivisionChart({ byDivision }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title float-none">Stock by Division</h3>
      </div>
      <div className="card-body">
        {byDivision.length === 0 ? (
          <p className="text-muted text-center mb-0 py-5">No active products yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDivision} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="divisionName" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip formatter={(value) => [value, "Units available"]} />
              <Bar dataKey="totalQuantityAvailable" fill="#17a2b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
