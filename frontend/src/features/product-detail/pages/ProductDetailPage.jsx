import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useProductDetail } from "@/features/product-detail/hooks/use-product-detail"
import { QuantitySelector } from "@/components/ui/QuantitySelector"
import { useCartStore } from "@/store/cart.store"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney, stockBadge } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading, isError } = useProductDetail(id)
  const addItem = useCartStore((s) => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isError || !product) {
    return <div className="alert alert-danger">Could not load this product. It may no longer be available.</div>
  }

  const badge = stockBadge(product.quantityAvailable, product.reorderLevel)
  const hasDiscount = Number(product.mrp) > Number(product.wsp)
  const attributes = [product.color, product.size].filter(Boolean).join(" · ")
  const breadcrumb = [product.divisionName, product.categoryName].filter(Boolean).join(" · ")
  const outOfStock = product.quantityAvailable <= 0

  function handleAddToCart() {
    addItem(product, quantity)
    setJustAdded(true)
  }

  return (
    <div>
      <Link to={ROUTES.STORE.HOME} className="text-muted small mb-3 d-inline-block">
        <i className="fas fa-arrow-left mr-1" /> Back to shopping
      </Link>

      <div className="row bg-white rounded shadow-sm p-4" id={`product-detail-${product.id}`}>
        <div
          className="col-md-5 d-flex align-items-center justify-content-center bg-light rounded"
          style={{ minHeight: "360px" }}
        >
          {product.productPhotoUrl ? (
            <img
              src={resolveMediaUrl(product.productPhotoUrl)}
              alt={product.name}
              className="img-fluid"
              style={{ maxHeight: "360px", objectFit: "contain" }}
            />
          ) : (
            <i className="fas fa-shirt fa-5x text-muted" />
          )}
        </div>

        <div className="col-md-7 pl-md-5 pt-4 pt-md-0">
          {breadcrumb ? <p className="text-muted mb-1">{breadcrumb}</p> : null}
          <h2 className="mb-2">{product.name}</h2>
          {attributes ? <p className="text-muted">{attributes}</p> : null}

          <div className="d-flex align-items-center mb-3" style={{ gap: "0.75rem" }}>
            <span className="h4 mb-0 font-weight-bold">{formatMoney(product.wsp)}</span>
            {hasDiscount ? (
              <span className="text-muted">
                <s>{formatMoney(product.mrp)}</s>
              </span>
            ) : null}
            <span className={`badge ${badge.className}`}>{badge.label}</span>
          </div>

          {product.description ? <p className="text-muted">{product.description}</p> : null}

          {!outOfStock ? (
            <>
              <div className="form-group">
                <label className="d-block small text-muted" htmlFor="product-detail-quantity">
                  Quantity
                </label>
                <QuantitySelector
                  id="product-detail-quantity"
                  value={quantity}
                  min={1}
                  max={product.quantityAvailable}
                  onChange={setQuantity}
                />
              </div>

              <button id="add-to-cart-button" type="button" className="btn btn-primary btn-lg" onClick={handleAddToCart}>
                <i className="fas fa-cart-plus mr-2" />
                Add to Cart
              </button>

              {justAdded ? (
                <div className="alert alert-success mt-3 py-2 d-flex align-items-center justify-content-between">
                  <span>Added to your cart.</span>
                  <button
                    id="view-cart-button"
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => navigate(ROUTES.STORE.CART)}
                  >
                    View Cart
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="alert alert-secondary">This product is currently out of stock.</div>
          )}
        </div>
      </div>
    </div>
  )
}
