import { Link, useNavigate, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useAuthStore } from "@/store/auth.store"
import { useProduct } from "@/features/products/hooks/use-products"
import { formatMoney, formatDateTimeIST, stockBadge } from "@/lib/format"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const isStaff = useAuthStore((s) => s.user?.role === "staff")
  const canManage = isAdmin || isStaff

  const { data: product, isLoading, isError } = useProduct(id)

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isError || !product) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Product not found.</div>
        <Link to={ROUTES.PRODUCTS.LIST}>Back to Products</Link>
      </PageWrapper>
    )
  }

  const stock = stockBadge(product.quantityAvailable, product.reorderLevel)

  return (
    <PageWrapper>
      <PageHeader
        title={product.name}
        description={product.productCode}
        actions={
          <>
            <Link to={ROUTES.PRODUCTS.LIST} className="btn btn-outline-secondary mr-2">
              Back to Products
            </Link>
            {canManage ? (
              <button
                type="button"
                id="product-detail-edit-button"
                className="btn btn-primary"
                onClick={() => navigate(ROUTES.PRODUCTS.EDIT(product.id))}
              >
                Edit
              </button>
            ) : null}
          </>
        }
      />

      <div className="row">
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-body text-center">
              {product.productPhotoUrl ? (
                <img
                  src={resolveMediaUrl(product.productPhotoUrl)}
                  alt={product.name}
                  className="img-fluid rounded mb-3"
                  style={{ maxHeight: 260, objectFit: "contain" }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center bg-light rounded mb-3 mx-auto"
                  style={{ width: "100%", maxWidth: 260, height: 260 }}
                >
                  <i className="fas fa-shirt fa-3x text-muted" />
                </div>
              )}

              {product.galleryImages?.length > 0 ? (
                <div className="d-flex flex-wrap justify-content-center" style={{ gap: 8 }}>
                  {product.galleryImages.map((image) => (
                    <img
                      key={image.mediaId}
                      src={resolveMediaUrl(image.url)}
                      alt={product.name}
                      className="rounded"
                      style={{ width: 56, height: 56, objectFit: "cover" }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <h5 className="card-title mb-0">Details</h5>
                <div>
                  <span className={`badge mr-2 ${stock.className}`}>{stock.label}</span>
                  <span className={`badge ${product.isActive ? "badge-success" : "badge-secondary"}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <dl className="row mb-0">
                <dt className="col-sm-4">Division</dt>
                <dd className="col-sm-8">{product.divisionName}</dd>

                <dt className="col-sm-4">Category</dt>
                <dd className="col-sm-8">{product.categoryName}</dd>

                <dt className="col-sm-4">Sub-category</dt>
                <dd className="col-sm-8">{product.subCategoryName ?? "—"}</dd>

                <dt className="col-sm-4">Color / Size</dt>
                <dd className="col-sm-8">
                  {product.color ?? "—"} {product.size ? `· ${product.size}` : ""}
                </dd>

                <dt className="col-sm-4">Description</dt>
                <dd className="col-sm-8">{product.description ?? "—"}</dd>
              </dl>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Pricing &amp; Stock</h5>
              <dl className="row mb-0">
                <dt className="col-sm-4">MRP</dt>
                <dd className="col-sm-8">{formatMoney(product.mrp)}</dd>

                <dt className="col-sm-4">WSP</dt>
                <dd className="col-sm-8">{formatMoney(product.wsp)}</dd>

                <dt className="col-sm-4">Quantity Available</dt>
                <dd className="col-sm-8">{product.quantityAvailable}</dd>

                <dt className="col-sm-4">Quantity Reserved</dt>
                <dd className="col-sm-8">{product.quantityReserved}</dd>

                <dt className="col-sm-4">Reorder Level</dt>
                <dd className="col-sm-8">{product.reorderLevel}</dd>

                <dt className="col-sm-4">Unit</dt>
                <dd className="col-sm-8">{product.unit}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">History</h5>
              <dl className="row mb-0">
                <dt className="col-sm-4">Created</dt>
                <dd className="col-sm-8">{formatDateTimeIST(product.createdAt)}</dd>

                <dt className="col-sm-4">Last Updated</dt>
                <dd className="col-sm-8">{formatDateTimeIST(product.updatedAt)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
