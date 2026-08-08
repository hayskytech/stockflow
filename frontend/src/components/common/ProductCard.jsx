import { Link } from "react-router-dom"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney, stockBadge } from "@/lib/format"
import { effectivePrice } from "@/lib/pricing"
import { SetBadge } from "@/components/ui/SetBadge"
import { ROUTES } from "@/constants/routes"

/**
 * Ecommerce product tile: photo, name, effective price (with the listed price struck-through
 * when discounted), stock badge. Links to the product detail page. Shared across storefront
 * features (home + product-detail's related products), so it lives here rather than inside a
 * single feature (CLAUDE.md).
 */
export function ProductCard({ product }) {
  const badge = stockBadge(product.quantityAvailable, product.reorderLevel)
  const hasDiscount = Number(product.discountPercent) > 0
  const attributes = [product.color, product.size].filter(Boolean).join(" · ")

  return (
    <Link to={ROUTES.STORE.PRODUCT_DETAIL(product.id)} className="text-decoration-none text-dark">
      <div className="card h-100 product-card" id={`product-card-${product.id}`}>
        <div className="product-card-image-wrap" style={{ aspectRatio: "4 / 5" }}>
          {product.productPhotoUrl ? (
            <img
              src={resolveMediaUrl(product.productPhotoUrl)}
              alt={product.name}
              className="product-card-image"
            />
          ) : (
            <i className="fas fa-shirt fa-3x text-muted" />
          )}
          {hasDiscount ? (
            <span className="product-card-discount-ribbon">
              {Math.round(Number(product.discountPercent))}% off
            </span>
          ) : null}
        </div>

        <div className="card-body d-flex flex-column p-3">
          <h6 className="card-title float-none mb-1 text-truncate" title={product.name}>
            {product.name}
          </h6>
          {attributes ? <p className="text-muted small mb-2">{attributes}</p> : null}
          {product.piecesPerSet > 1 ? (
            <div className="mb-2">
              <SetBadge piecesPerSet={product.piecesPerSet} />
            </div>
          ) : null}

          <div className="mt-auto d-flex align-items-center justify-content-between">
            <div>
              {hasDiscount ? (
                <div className="text-muted small">
                  <s>{formatMoney(product.price)}</s>
                </div>
              ) : null}
              <div className="product-card-price">
                {formatMoney(effectivePrice(product.price, product.discountPercent))}
              </div>
            </div>
            <span className={`badge ${badge.className}`}>{badge.label}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
