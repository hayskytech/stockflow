import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useProductDetail } from "@/features/product-detail/hooks/use-product-detail"
import { useRelatedProducts } from "@/features/product-detail/hooks/use-related-products"
import { QuantitySelector } from "@/components/ui/QuantitySelector"
import { ProductCard } from "@/components/common/ProductCard"
import { LoginRequiredModal } from "@/components/common/LoginRequiredModal"
import { SetBadge } from "@/components/ui/SetBadge"
import { useCartStore } from "@/store/cart.store"
import { useAuthStore } from "@/store/auth.store"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney, stockBadge } from "@/lib/format"
import { effectivePrice, setEffectivePrice } from "@/lib/pricing"
import { ROUTES } from "@/constants/routes"

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading, isError } = useProductDetail(id)
  const { data: relatedProducts = [] } = useRelatedProducts(product?.categoryId, product?.id)
  const addItem = useCartStore((s) => s.addItem)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [backorderConsent, setBackorderConsent] = useState(false)

  useEffect(() => {
    setSelectedImageUrl(null)
  }, [id])

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
  const hasDiscount = Number(product.discountPercent) > 0
  const isSet = Number(product.piecesPerSet) > 1
  const attributes = [product.color, product.size].filter(Boolean).join(" · ")
  const breadcrumb = [product.divisionName, product.categoryName].filter(Boolean).join(" · ")
  const outOfStock = product.quantityAvailable <= 0

  const galleryUrls = (product.galleryImages ?? []).map((img) => img.url)
  const allImageUrls = [product.productPhotoUrl, ...galleryUrls].filter(Boolean)
  const displayImageUrl = selectedImageUrl ?? allImageUrls[0] ?? null

  function handleAddToCart() {
    if (!accessToken) {
      setLoginModalOpen(true)
      return
    }
    addItem(product, quantity, { isBackorder: outOfStock })
    setJustAdded(true)
  }

  return (
    <div>
      <Link to={ROUTES.STORE.HOME} className="text-muted small mb-3 d-inline-block">
        <i className="fas fa-arrow-left mr-1" /> Back to shopping
      </Link>

      <div className="row bg-white rounded shadow-sm p-3 p-md-4" id={`product-detail-${product.id}`}>
        <div className="col-12 col-md-5">
          <div
            className="d-flex align-items-center justify-content-center bg-light rounded overflow-hidden"
            style={{ aspectRatio: "4 / 5" }}
          >
            {displayImageUrl ? (
              <img
                src={resolveMediaUrl(displayImageUrl)}
                alt={product.name}
                className="w-100 h-100"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <i className="fas fa-shirt fa-5x text-muted" />
            )}
          </div>

          {allImageUrls.length > 1 ? (
            <div id="product-detail-gallery" className="d-flex flex-wrap mt-2" style={{ gap: "0.5rem" }}>
              {allImageUrls.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`btn p-0 border rounded overflow-hidden ${url === displayImageUrl ? "border-primary" : ""}`}
                  style={{ width: 56, height: 56 }}
                  onClick={() => setSelectedImageUrl(url)}
                >
                  <img
                    src={resolveMediaUrl(url)}
                    alt=""
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-12 col-md-7 pl-md-5 pt-4 pt-md-0">
          {breadcrumb ? <p className="text-muted mb-1">{breadcrumb}</p> : null}
          <h2 className="mb-2">{product.name}</h2>
          {attributes ? <p className="text-muted">{attributes}</p> : null}

          <div className={`d-flex align-items-center flex-wrap ${isSet ? "mb-1" : "mb-3"}`} style={{ gap: "0.75rem" }}>
            <span className="h4 mb-0 font-weight-bold">
              {formatMoney(
                isSet
                  ? setEffectivePrice(product.price, product.discountPercent, product.piecesPerSet)
                  : effectivePrice(product.price, product.discountPercent)
              )}
            </span>
            {hasDiscount ? (
              <span className="text-muted">
                <s>{formatMoney(isSet ? product.price * product.piecesPerSet : product.price)}</s>
              </span>
            ) : null}
            <span className={`badge ${badge.className}`}>{badge.label}</span>
            {isSet ? <SetBadge piecesPerSet={product.piecesPerSet} /> : null}
          </div>

          {isSet ? (
            <p className="text-muted small mb-3">
              {formatMoney(effectivePrice(product.price, product.discountPercent))} per piece × {product.piecesPerSet} pieces
            </p>
          ) : null}

          {product.description ? <p className="text-muted">{product.description}</p> : null}

          <div className="form-group">
            <label className="d-block small text-muted" htmlFor="product-detail-quantity">
              {isSet ? "Quantity (sets)" : "Quantity"}
            </label>
            <QuantitySelector
              id="product-detail-quantity"
              value={quantity}
              min={1}
              max={outOfStock ? undefined : product.quantityAvailable}
              onChange={setQuantity}
            />
            {isSet ? (
              <small className="form-text text-muted">= {quantity * product.piecesPerSet} pieces</small>
            ) : null}
          </div>

          {outOfStock ? (
            <div className="alert alert-secondary">
              <p className="mb-2">This product is currently out of stock.</p>
              <div className="custom-control custom-checkbox">
                <input
                  id="backorder-consent-checkbox"
                  type="checkbox"
                  className="custom-control-input"
                  checked={backorderConsent}
                  onChange={(e) => setBackorderConsent(e.target.checked)}
                />
                <label className="custom-control-label" htmlFor="backorder-consent-checkbox">
                  Order anyway — I&apos;m okay waiting for restock (back-order)
                </label>
              </div>
            </div>
          ) : null}

          <button
            id="add-to-cart-button"
            type="button"
            className="btn btn-primary btn-lg"
            disabled={outOfStock && !backorderConsent}
            onClick={handleAddToCart}
          >
            <i className="fas fa-cart-plus mr-2" />
            {outOfStock ? "Order — Back-order" : "Add to Cart"}
          </button>

          {justAdded ? (
            <div className="alert alert-success mt-3 py-2 d-flex align-items-center justify-content-between">
              <span>{outOfStock ? "Added to your cart as a back-order." : "Added to your cart."}</span>
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
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <div id="related-products" className="mt-4">
          <h5 className="mb-3">Related Products</h5>
          <div className="row">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="col-6 col-md-3 mb-4">
                <ProductCard product={relatedProduct} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <LoginRequiredModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  )
}
