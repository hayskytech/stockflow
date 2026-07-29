import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuthStore } from "@/store/auth.store"
import { useProductOptions } from "@/hooks/use-product-options"
import { useStockStore } from "@/features/stock/stock.store"
import { useCreateStockBatch, useDeleteStock, useStockList } from "@/features/stock/hooks/use-stock"
import { StockImportModal } from "@/features/stock/components/StockImportModal"
import { StockFormModal } from "@/features/stock/components/StockFormModal"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { SearchSelect } from "@/components/ui/SearchSelect"
import { useFormatMoney } from "@/hooks/use-warehouse-details"

export function StockPage() {
  const formatMoney = useFormatMoney()
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const isStaff = useAuthStore((s) => s.user?.role === "staff")
  const canManage = isAdmin || isStaff

  const search = useStockStore((s) => s.search)
  const setSearch = useStockStore((s) => s.setSearch)
  const productFilter = useStockStore((s) => s.productFilter)
  const setProductFilter = useStockStore((s) => s.setProductFilter)

  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [deletingStock, setDeletingStock] = useState(null)
  const [serverError, setServerError] = useState("")
  const [addStockError, setAddStockError] = useState("")

  const { data: products = [] } = useProductOptions()

  const { data, isLoading, isError } = useStockList({
    page,
    per_page: 10,
    search,
    product_id: productFilter || undefined,
  })

  const createStockBatch = useCreateStockBatch()
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

  async function handleAddStock(value) {
    setAddStockError("")
    try {
      await createStockBatch.mutateAsync(value)
      setAddStockOpen(false)
    } catch (err) {
      setAddStockError(err.response?.data?.message ?? "Could not add stock")
    }
  }

  const columns = [
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
    { key: "categoryName", label: "Category", hideable: true },
    { key: "quantity", label: "Quantity" },
    { key: "size", label: "Size", render: (row) => row.size ?? "—", hideable: true },
    { key: "mrp", label: "MRP", render: (row) => formatMoney(row.mrp), hideable: true },
    { key: "wsp", label: "WSP", render: (row) => formatMoney(row.wsp), hideable: true },
    {
      key: "invoiceNo",
      label: "Invoice",
      hideable: true,
      render: (row) => (
        <>
          {row.invoiceNo}
          <div className="text-muted small">{row.invoiceDate ?? "—"}</div>
        </>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <RowActionsMenu
          actions={[
            canManage && {
              key: "delete",
              label: "Delete",
              icon: "fa-trash",
              variant: "danger",
              onClick: () => setDeletingStock(row),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Stock"
        count={data?.total}
        description="Intake batches received against products"
        actions={
          canManage ? (
            <>
              <button
                type="button"
                id="stock-add-button"
                className="btn btn-outline-primary mr-2"
                onClick={() => {
                  setAddStockError("")
                  setAddStockOpen(true)
                }}
              >
                <i className="fas fa-plus mr-1" />
                Add Stock
              </button>
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
            <div className="col-md-6">
              <input
                id="stock-search-input"
                type="search"
                className="form-control"
                placeholder="Search by invoice or product…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-6">
              <SearchSelect
                id="stock-product-filter"
                placeholder="All products"
                value={productFilter}
                onChange={(value) => {
                  setProductFilter(value)
                  setPage(1)
                }}
                options={products.map((product) => ({ value: product.id, label: product.name }))}
              />
            </div>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            tableKey="stock"
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-boxes"
            emptyTitle="No stock yet"
            emptyDescription="Add stock or import a stock excel/CSV to get started."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <StockImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {addStockOpen ? (
        <StockFormModal
          open={addStockOpen}
          products={products}
          onClose={() => setAddStockOpen(false)}
          onSubmit={handleAddStock}
          isSubmitting={createStockBatch.isPending}
          serverError={addStockError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingStock)}
        title="Delete stock batch?"
        message={`Are you sure you want to delete this batch of "${deletingStock?.productName}" (invoice ${deletingStock?.invoiceNo})? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingStock(null)}
      />
    </PageWrapper>
  )
}
