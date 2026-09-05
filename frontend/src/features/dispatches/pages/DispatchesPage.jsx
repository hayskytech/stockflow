import { useState } from "react"
import { Link } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { useDispatches } from "@/features/dispatches/hooks/use-dispatches"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function DispatchesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, isError } = useDispatches({
    page,
    per_page: 10,
    search: search || undefined,
  })

  const columns = [
    {
      key: "dispatchNumber",
      label: "Dispatch #",
      render: (row) => <Link to={ROUTES.DISPATCHES.DETAIL(row.id)}>{row.dispatchNumber}</Link>,
    },
    { key: "orderNumber", label: "Order #" },
    { key: "shippingName", label: "Ship to", hideable: true },
    { key: "unitCount", label: "Units", hideable: true },
    {
      key: "courierName",
      label: "Courier",
      hideable: true,
      render: (row) =>
        row.courierName ? (
          <>
            <div>{row.courierName}</div>
            {row.awbNumber ? <div className="text-muted small">{row.awbNumber}</div> : null}
          </>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "dispatchedByName", label: "Dispatched by", hideable: true },
    { key: "createdAt", label: "Dispatched at", render: (row) => formatDateTimeIST(row.createdAt) },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Dispatches"
        count={data?.total}
        description="Record of every order that left the warehouse"
      />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <input
                id="dispatches-search"
                type="text"
                className="form-control"
                placeholder="Search by dispatch #, order #, or AWB number…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          <DataTable
            tableKey="dispatches"
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-truck"
            emptyTitle="No dispatches yet"
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
