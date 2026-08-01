import { useState } from "react"
import { Link } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { useProductOptions } from "@/hooks/use-product-options"
import { useStockLedgerStore } from "@/features/stock-ledger/stock-ledger.store"
import { useStockLedgerList } from "@/features/stock-ledger/hooks/use-stock-ledger"
import { formatDateTimeIST } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

const REFERENCE_LABELS = {
  order: { label: "Order", className: "badge-info" },
  adjustment: { label: "Adjustment", className: "badge-secondary" },
  import: { label: "Import", className: "badge-primary" },
}

export function StockLedgerPage() {
  const search = useStockLedgerStore((s) => s.search)
  const setSearch = useStockLedgerStore((s) => s.setSearch)
  const productFilter = useStockLedgerStore((s) => s.productFilter)
  const setProductFilter = useStockLedgerStore((s) => s.setProductFilter)
  const changeTypeFilter = useStockLedgerStore((s) => s.changeTypeFilter)
  const setChangeTypeFilter = useStockLedgerStore((s) => s.setChangeTypeFilter)
  const referenceTypeFilter = useStockLedgerStore((s) => s.referenceTypeFilter)
  const setReferenceTypeFilter = useStockLedgerStore((s) => s.setReferenceTypeFilter)
  const dateFrom = useStockLedgerStore((s) => s.dateFrom)
  const setDateFrom = useStockLedgerStore((s) => s.setDateFrom)
  const dateTo = useStockLedgerStore((s) => s.dateTo)
  const setDateTo = useStockLedgerStore((s) => s.setDateTo)
  const resetFilters = useStockLedgerStore((s) => s.resetFilters)

  const [page, setPage] = useState(1)

  const hasActiveFilters = Boolean(
    search || productFilter || changeTypeFilter || referenceTypeFilter || dateFrom || dateTo
  )

  function handleResetFilters() {
    resetFilters()
    setPage(1)
  }

  const { data: products = [] } = useProductOptions()

  const { data, isLoading, isError } = useStockLedgerList({
    page,
    per_page: 10,
    search: search || undefined,
    product_id: productFilter || undefined,
    change_type: changeTypeFilter || undefined,
    reference_type: referenceTypeFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  })

  function updateFilter(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  const columns = [
    {
      key: "createdAt",
      label: "Date",
      render: (row) => formatDateTimeIST(row.createdAt),
    },
    {
      key: "productName",
      label: "Product",
      render: (row) => (
        <>
          {row.productName}
          <div className="text-muted small">{row.productCode}</div>
        </>
      ),
    },
    {
      key: "quantity",
      label: "Movement",
      render: (row) =>
        row.changeType === "in" ? (
          <span className="badge badge-success">+{row.quantity} In</span>
        ) : (
          <span className="badge badge-danger">−{row.quantity} Out</span>
        ),
    },
    {
      key: "referenceType",
      label: "Reference",
      render: (row) => {
        const reference = REFERENCE_LABELS[row.referenceType] ?? {
          label: row.referenceType,
          className: "badge-light",
        }
        const badge = <span className={`badge ${reference.className}`}>{reference.label}</span>
        return row.referenceType === "order" && row.referenceId ? (
          <Link to={ROUTES.ORDERS.DETAIL(row.referenceId)}>{badge}</Link>
        ) : (
          badge
        )
      },
    },
    {
      key: "note",
      label: "Note",
      render: (row) => row.note ?? "—",
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Stock Ledger"
        count={data?.total}
        description="Append-only history of every stock movement — imports, orders, and adjustments"
      />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <input
                id="stock-ledger-search-input"
                type="search"
                className="form-control"
                placeholder="Search product, code, or note…"
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                id="stock-ledger-product-filter"
                className="form-control"
                value={productFilter}
                onChange={(e) => updateFilter(setProductFilter)(e.target.value)}
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                id="stock-ledger-change-type-filter"
                className="form-control"
                value={changeTypeFilter}
                onChange={(e) => updateFilter(setChangeTypeFilter)(e.target.value)}
              >
                <option value="">In & Out</option>
                <option value="in">In</option>
                <option value="out">Out</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                id="stock-ledger-reference-type-filter"
                className="form-control"
                value={referenceTypeFilter}
                onChange={(e) => updateFilter(setReferenceTypeFilter)(e.target.value)}
              >
                <option value="">All references</option>
                <option value="import">Import</option>
                <option value="order">Order</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-2">
              <input
                id="stock-ledger-date-from"
                type="date"
                className="form-control"
                title="From date"
                value={dateFrom}
                onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <input
                id="stock-ledger-date-to"
                type="date"
                className="form-control"
                title="To date"
                value={dateTo}
                onChange={(e) => updateFilter(setDateTo)(e.target.value)}
              />
            </div>
            <div className="col-md-8 d-flex align-items-start justify-content-end">
              <button
                id="stock-ledger-clear-filters-btn"
                type="button"
                className="btn btn-outline-secondary"
                disabled={!hasActiveFilters}
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>

          <p className="text-muted small mb-2">
            {data?.total ?? 0} record{(data?.total ?? 0) === 1 ? "" : "s"} found
          </p>

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-book"
            emptyTitle={hasActiveFilters ? "No stock movements match the selected filters" : "No stock movements yet"}
            emptyDescription={
              hasActiveFilters
                ? "Try adjusting or clearing the filters above."
                : "Movements appear here when stock is imported, reserved, dispatched, or adjusted."
            }
            emptyAction={
              hasActiveFilters ? (
                <button type="button" className="btn btn-sm btn-link" onClick={handleResetFilters}>
                  Reset Filters
                </button>
              ) : (
                <div>
                  <Link to={ROUTES.STOCK.LIST} className="btn btn-sm btn-primary mr-2">
                    Import Stock
                  </Link>
                  <Link to={ROUTES.PRODUCTS.LIST} className="btn btn-sm btn-outline-secondary">
                    View Products
                  </Link>
                </div>
              )
            }
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
