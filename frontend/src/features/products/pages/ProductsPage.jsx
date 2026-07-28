import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { useAuthStore } from "@/store/auth.store"
import { useDivisionOptions, useCategoryOptions } from "@/hooks/use-catalog-options"
import { useProductsStore } from "@/features/products/products.store"
import { useProducts } from "@/features/products/hooks/use-products"
import { ProductImportModal } from "@/features/products/components/ProductImportModal"
import { resolveMediaUrl } from "@/lib/media"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

export function ProductsPage() {
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()
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

  const { data: divisions = [] } = useDivisionOptions()
  const { data: categories = [] } = useCategoryOptions(divisionFilter)

  const { data, isLoading, isError } = useProducts({
    page,
    per_page: 50,
    search,
    division_id: divisionFilter || undefined,
    category_id: categoryFilter || undefined,
  })

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
    { key: "productCode", label: "Code", hideable: true },
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div>
          <Link to={ROUTES.PRODUCTS.DETAIL(row.id)}>{row.name}</Link>
          <div>
            <small className="text-muted">{row.categoryName}</small>
          </div>
        </div>
      ),
    },
    { key: "mrp", label: "MRP", render: (row) => formatMoney(row.mrp), hideable: true },
    { key: "wsp", label: "WSP", render: (row) => formatMoney(row.wsp), hideable: true },
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
      hideable: true,
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span>
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
              key: "edit",
              label: "Edit",
              icon: "fa-pen",
              onClick: () => navigate(ROUTES.PRODUCTS.EDIT(row.id)),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Products"
        count={data?.total}
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

          <DataTable
            tableKey="products"
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

      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </PageWrapper>
  )
}
