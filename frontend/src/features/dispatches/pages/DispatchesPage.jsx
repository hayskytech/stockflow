import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { useDispatches } from "@/features/dispatches/hooks/use-dispatches"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function DispatchesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, isError } = useDispatches({
    page,
    per_page: 10,
    search: search || undefined,
  })

  const columns = [
    { key: "dispatchNumber", label: "Dispatch #" },
    { key: "orderNumber", label: "Order #" },
    { key: "shippingName", label: "Ship to" },
    { key: "unitCount", label: "Units" },
    {
      key: "courierName",
      label: "Courier",
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
    { key: "dispatchedByName", label: "Dispatched by" },
    { key: "createdAt", label: "Dispatched at", render: (row) => formatDateTimeIST(row.createdAt) },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate(ROUTES.DISPATCHES.DETAIL(row.id))}
        >
          View
        </button>
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader title="Dispatches" description="Scan-verified record of every order that left the warehouse" />

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
