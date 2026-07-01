function formatMoney(value) {
  return `₹${Number(value).toFixed(2)}`
}

/** Derives the stock badge label + Bootstrap contextual class from stock levels. */
function stockBadge(quantityAvailable, reorderLevel) {
  if (quantityAvailable <= 0) return { label: "Out of stock", className: "badge-danger" }
  if (quantityAvailable <= reorderLevel) return { label: "Low stock", className: "badge-warning" }
  return { label: "In stock", className: "badge-success" }
}

/** Ecommerce product tile: photo, name, WSP price (with MRP struck-through), stock badge. */
export function ProductCard({ product }) {
  const badge = stockBadge(product.quantityAvailable, product.reorderLevel)
  const hasDiscount = Number(product.mrp) > Number(product.wsp)
  const attributes = [product.color, product.size].filter(Boolean).join(" · ")

  return (
    <div className="card h-100 shadow-sm" id={`product-card-${product.id}`}>
      <div
        className="d-flex align-items-center justify-content-center bg-white border-bottom"
        style={{ height: "200px", overflow: "hidden" }}
      >
        {product.productPhotoUrl ? (
          <img
            src={product.productPhotoUrl}
            alt={product.name}
            className="img-fluid"
            style={{ maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <i className="fas fa-shirt fa-3x text-muted" />
        )}
      </div>

      <div className="card-body d-flex flex-column p-3">
        <h6 className="card-title mb-1 text-truncate" title={product.name}>
          {product.name}
        </h6>
        {attributes ? <p className="text-muted small mb-2">{attributes}</p> : null}

        <div className="mt-auto d-flex align-items-center justify-content-between">
          <div>
            {hasDiscount ? (
              <div className="text-muted small">
                <s>{formatMoney(product.mrp)}</s>
              </div>
            ) : null}
            <div className="font-weight-bold text-dark">{formatMoney(product.wsp)}</div>
          </div>
          <span className={`badge ${badge.className}`}>{badge.label}</span>
        </div>
      </div>
    </div>
  )
}
