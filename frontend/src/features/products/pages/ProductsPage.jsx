import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useAuthStore } from "@/store/auth.store"
import { useDivisionOptions, useCategoryOptions } from "@/hooks/use-catalog-options"
import { useProductsStore } from "@/features/products/products.store"
import { useDeleteProduct, useProducts } from "@/features/products/hooks/use-products"
import { ProductImportModal } from "@/features/products/components/ProductImportModal"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function ProductsPage() {
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const isStaff = useAuthStore((s) => s.user?.role === "staff")
  const canManage = isAdmin || isStaff

  const [importOpen, setImportOpen] = useState(false)

  const search = useProductsStore((s) => s.search)
  const setSearch = useProductsStore((s) => s.setSearch)
  const divisionFilter = useProductsStore((s) => s.divisionFilter)
  const setDivisionFilter = useProductsStore((s) => s.setDivisionFilter)
  const categoryFilter = useProductsStore((s) => s.categoryFilter)
  const setCategoryFilter = useProductsStore((s) => s.setCategoryFilter)

  const [page, setPage] = useState(1)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [serverError, setServerError] = useState("")

  const { data: divisions = [] } = useDivisionOptions()
  const { data: categories = [] } = useCategoryOptions(divisionFilter)

  const { data, isLoading, isError } = useProducts({
    page,
    per_page: 10,
    search,
    division_id: divisionFilter || undefined,
    category_id: categoryFilter || undefined,
  })

  const deleteProduct = useDeleteProduct()

  async function handleDelete() {
    try {
      await deleteProduct.mutateAsync(deletingProduct.id)
      setDeletingProduct(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete product")
      setDeletingProduct(null)
    }
  }

  const columns = [
    {
      key: "productPhotoUrl",
      label: "",
      render: (row) =>
        row.productPhotoUrl ? (
          <img
            src={resolveMediaUrl(row.productPhotoUrl)}
            alt={row.name}
            style={{ width: 40, height: 40, objectFit: "cover" }}
            className="rounded"
          />
        ) : (
          <div
            className="d-flex align-items-center justify-content-center bg-light rounded"
            style={{ width: 40, height: 40 }}
          >
            <i className="fas fa-shirt text-muted" />
          </div>
        ),
    },
    { key: "productCode", label: "Code" },
    { key: "name", label: "Name" },
    { key: "categoryName", label: "Category" },
    { key: "mrp", label: "MRP", render: (row) => `₹${Number(row.mrp).toFixed(2)}` },
    { key: "wsp", label: "WSP", render: (row) => `₹${Number(row.wsp).toFixed(2)}` },
    {
      key: "quantityAvailable",
      label: "Stock",
      render: (row) => (
        <span className={row.quantityAvailable <= row.reorderLevel ? "text-danger font-weight-bold" : ""}>
          {row.quantityAvailable}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mr-2"
            onClick={() => navigate(ROUTES.PRODUCTS.DETAIL(row.id))}
          >
            View
          </button>
          {canManage ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary mr-2"
                onClick={() => navigate(ROUTES.PRODUCTS.EDIT(row.id))}
              >
                Edit
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingProduct(row)}>
                Delete
              </button>
            </>
          ) : null}
        </>
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Products"
        description="Manage your product catalog and stock levels"
        actions={
          canManage ? (
            <>
              <button
                type="button"
                id="products-import-button"
                className="btn btn-outline-primary mr-2"
                onClick={() => setImportOpen(true)}
              >
                <i className="fas fa-file-import mr-1" />
                Import
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.PRODUCTS.NEW)}>
                <i className="fas fa-plus mr-1" />
                Add Product
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
                type="search"
                className="form-control"
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
                value={divisionFilter}
                onChange={(e) => {
                  setDivisionFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All divisions</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setPage(1)
                }}
                disabled={!divisionFilter}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {serverError ? <div className="alert alert-danger">{serverError}</div> : null}

          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            emptyIcon="fa-shirt"
            emptyTitle="No products yet"
            emptyDescription="Add your first product to get started."
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deletingProduct)}
        title="Delete product?"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingProduct(null)}
      />

      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </PageWrapper>
  )
}
