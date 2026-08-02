import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { StockFormModal } from "@/features/stock/components/StockFormModal"
import { useCreateStockBatch } from "@/features/stock/hooks/use-stock"
import { useAuthStore } from "@/store/auth.store"
import { useProduct } from "@/features/products/hooks/use-products"
import { formatDateTimeIST, stockBadge } from "@/lib/format"
import { effectivePrice, setEffectivePrice } from "@/lib/pricing"
import { SetBadge } from "@/components/ui/SetBadge"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { resolveMediaUrl } from "@/lib/media"
import { ROUTES } from "@/constants/routes"

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const isStaff = useAuthStore((s) => s.user?.role === "staff")
  const canManage = isAdmin || isStaff

  const [addStockOpen, setAddStockOpen] = useState(false)
  const [addStockError, setAddStockError] = useState("")
  const createStockBatch = useCreateStockBatch()

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
      </PageWrapper>
    )
  }

  const stock = stockBadge(product.quantityAvailable, product.reorderLevel)
  const isSet = Number(product.piecesPerSet) > 1

  async function handleAddStock(value) {
    setAddStockError("")
    try {
      await createStockBatch.mutateAsync(value)
      setAddStockOpen(false)
    } catch (err) {
      setAddStockError(err.response?.data?.message ?? "Could not add stock")
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title={product.name}
        description={`${product.productCode} · ${product.categoryName}`}
        actions={
          <>
            {canManage && product.quantityAvailable <= 0 ? (
              <button
                type="button"
                id="product-detail-add-stock-button"
                className="btn btn-outline-primary mr-2"
                onClick={() => {
                  setAddStockError("")
                  setAddStockOpen(true)
                }}
              >
                <i className="fas fa-plus mr-1" />
                Add Stock
              </button>
            ) : null}
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
                  className="d-flex flex-column align-items-center justify-content-center bg-light rounded mb-3 mx-auto"
                  style={{ width: "100%", maxWidth: 260, height: 260 }}
                >
                  <i className="fas fa-shirt fa-3x text-muted" />
                  <div className="text-muted small mt-2">No Image available</div>
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
                  <span className={`badge mr-2 ${product.isActive ? "badge-success" : "badge-secondary"}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                  {isSet ? <SetBadge piecesPerSet={product.piecesPerSet} /> : null}
                </div>
              </div>

              <dl className="row mb-0">
                <dt className="col-sm-4">Division</dt>
                <dd className="col-sm-8">{product.divisionName}</dd>

                <dt className="col-sm-4">Category</dt>
                <dd className="col-sm-8">{product.categoryName}</dd>

                <dt className="col-sm-4">Sub-category</dt>
                <dd className="col-sm-8">{product.subCategoryName || "Not available"}</dd>

                <dt className="col-sm-4">Color</dt>
                <dd className="col-sm-8">{product.color || "Not available"}</dd>

                <dt className="col-sm-4">Size</dt>
                <dd className="col-sm-8">{product.size || "Not available"}</dd>

                <dt className="col-sm-4">Description</dt>
                <dd className="col-sm-8">{product.description || "Not available"}</dd>
              </dl>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Pricing &amp; Stock</h5>
              <dl className="row mb-0">
                <dt className="col-sm-4">Price</dt>
                <dd className="col-sm-8">{Number(product.price) > 0 ? formatMoney(product.price) : "Not set"}</dd>

                <dt className="col-sm-4">Discount</dt>
                <dd className="col-sm-8">
                  {Number(product.discountPercent) > 0 ? `${product.discountPercent}%` : "None"}
                </dd>

                <dt className="col-sm-4">Effective Price</dt>
                <dd className="col-sm-8">{formatMoney(effectivePrice(product.price, product.discountPercent))}</dd>

                <dt className="col-sm-4">Pieces per Set</dt>
                <dd className="col-sm-8">
                  {product.piecesPerSet}
                  {isSet
                    ? ` (set price: ${formatMoney(setEffectivePrice(product.price, product.discountPercent, product.piecesPerSet))})`
                    : ""}
                </dd>

                <dt className="col-sm-4">Quantity Available</dt>
                <dd className="col-sm-8">{product.quantityAvailable} {isSet ? "Sets" : "Units"}</dd>

                <dt className="col-sm-4">Quantity Reserved</dt>
                <dd className="col-sm-8">{product.quantityReserved} {isSet ? "Sets" : "Units"}</dd>

                <dt className="col-sm-4">Reorder Level</dt>
                <dd className="col-sm-8">{product.reorderLevel}</dd>
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

      {addStockOpen ? (
        <StockFormModal
          open={addStockOpen}
          products={[{ id: product.id, name: product.name }]}
          initialProductId={product.id}
          onClose={() => setAddStockOpen(false)}
          onSubmit={handleAddStock}
          isSubmitting={createStockBatch.isPending}
          serverError={addStockError}
        />
      ) : null}
    </PageWrapper>
  )
}
