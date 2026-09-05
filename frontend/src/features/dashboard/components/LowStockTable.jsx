import { Link } from "@/lib/nav"
import { DataTable } from "@/components/common/DataTable"
import { ROUTES } from "@/constants/routes"

const COLUMNS = [
  {
    key: "name",
    label: "Product",
    render: (row) => <Link to={ROUTES.PRODUCTS.EDIT(row.id)}>{row.name}</Link>,
  },
  { key: "categoryName", label: "Category" },
  {
    key: "quantityAvailable",
    label: "Available",
    render: (row) => <span className="text-danger font-weight-bold">{row.quantityAvailable}</span>,
  },
  { key: "reorderLevel", label: "Reorder Level" },
]

/** Table of active products at or below their reorder level, worst-off first. */
export function LowStockTable({ items }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title float-none">Low Stock Items</h3>
      </div>
      <div className="card-body p-0">
        <DataTable
          columns={COLUMNS}
          rows={items}
          isLoading={false}
          isError={false}
          emptyIcon="fa-circle-check"
          emptyTitle="All stocked up"
          emptyDescription="No products are at or below their reorder level."
        />
      </div>
    </div>
  )
}
