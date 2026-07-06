import { useState } from "react"
import { Link } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuthStore } from "@/store/auth.store"
import { useProductOptions } from "@/hooks/use-product-options"
import { useStockStore } from "@/features/stock/stock.store"
import { useDeleteStock, useStockList } from "@/features/stock/hooks/use-stock"
import { StockImportModal } from "@/features/stock/components/StockImportModal"
import { formatMoney } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

const STATUS_LABELS = {
  in_stock: { label: "In Stock", className: "badge-success" },
  reserved: { label: "Reserved", className: "badge-warning" },
  dispatched: { label: "Dispatched", className: "badge-secondary" },
}

export function StockPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const isStaff = useAuthStore((s) => s.user?.role === "staff")
  const canManage = isAdmin || isStaff

  const search = useStockStore((s) => s.search)
  const setSearch = useStockStore((s) => s.setSearch)
  const statusFilter = useStockStore((s) => s.statusFilter)
  const setStatusFilter = useStockStore((s) => s.setStatusFilter)
  const productFilter = useStockStore((s) => s.productFilter)
  const setProductFilter = useStockStore((s) => s.setProductFilter)

  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [deletingStock, setDeletingStock] = useState(null)
  const [serverError, setServerError] = useState("")

  const { data: products = [] } = useProductOptions()

  const { data, isLoading, isError } = useStockList({
    page,
    per_page: 10,
    search,
    status: statusFilter || undefined,
    product_id: productFilter || undefined,
  })

  const deleteStock = useDeleteStock()

  async function handleDelete() {
    try {
      await deleteStock.mutateAsync(deletingStock.id)
      setDeletingStock(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete stock item")
      setDeletingStock(null)
    }
  }

  const columns = [
    { key: "barcode", label: "Barcode" },
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
    { key: "categoryName", label: "Category" },
    { key: "size", label: "Size", render: (row) => row.size ?? "—" },
    { key: "mrp", label: "MRP", render: (row) => formatMoney(row.mrp) },
    { key: "wsp", label: "WSP", render: (row) => formatMoney(row.wsp) },
    {
      key: "invoiceNo",
      label: "Invoice",
      render: (row) => (
        <>
          {row.invoiceNo}
          <div className="text-muted small">{row.invoiceDate ?? "—"}</div>
        </>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = STATUS_LABELS[row.status] ?? { label: row.status, className: "badge-secondary" }
        return <span className={`badge ${status.className}`}>{status.label}</span>
      },
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) =>
        canManage && row.status === "in_stock" ? (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingStock(row)}>
            Delete
          </button>
        ) : null,
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Stock"
        description="Barcoded physical inventory received against products"
        actions={
          canManage ? (
            <>
              <Link to={ROUTES.STOCK.SCAN} id="stock-scan-button" className="btn btn-outline-primary mr-2">
                <i className="fas fa-barcode mr-1" />
                Scan Items
              </Link>
              <button type="button" id="stock-import-button" className="btn btn-primary" onClick={() => setImportOpen(true)}>
                <i className="fas fa-file-import mr-1" />
                Import
              </button>
            </>
          ) : null
        }
      />

      <div className="card">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                id="stock-search-input"
                type="search"
                className="form-control"
                placeholder="Search by barcode, invoice, or product…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-4">
              <select
                id="stock-product-filter"
                className="form-control"
                value={productFilter}
                onChange={(e) => {
                  setProductFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <select
                id="stock-status-filter"
                className="form-control"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="reserved">Reserved</option>
                <option value="dispatched">Dispatched</option>
              </select>
            </div>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-barcode"
            emptyTitle="No stock yet"
            emptyDescription="Import a stock excel/CSV to get started."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <StockImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={Boolean(deletingStock)}
        title="Delete stock item?"
        message={`Are you sure you want to delete barcode "${deletingStock?.barcode}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingStock(null)}
      />
    </PageWrapper>
  )
}
