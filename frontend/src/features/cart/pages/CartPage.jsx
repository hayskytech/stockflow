import { Link, useNavigate } from "react-router-dom"
import { useCartStore } from "@/store/cart.store"
import { QuantitySelector } from "@/components/ui/QuantitySelector"
import { EmptyState } from "@/components/common/EmptyState"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney } from "@/lib/format"
import { ROUTES } from "@/constants/routes"

export function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const navigate = useNavigate()

  const subtotal = items.reduce((sum, item) => sum + Number(item.wsp) * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="text-center">
        <EmptyState
          icon="fa-cart-shopping"
          title="Your cart is empty"
          description="Browse the catalog and add items you'd like to buy."
        />
        <Link to={ROUTES.STORE.HOME} className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-4">Your Cart</h2>

      <div className="row">
        <div className="col-md-8">
          {items.map((item) => (
            <div key={item.productId} className="card mb-3" id={`cart-item-${item.productId}`}>
              <div className="card-body d-flex align-items-center">
                <div
                  className="mr-3 d-flex align-items-center justify-content-center bg-light rounded"
                  style={{ width: "80px", height: "80px", flexShrink: 0 }}
                >
                  {item.productPhotoUrl ? (
                    <img
                      src={resolveMediaUrl(item.productPhotoUrl)}
                      alt={item.name}
                      className="img-fluid"
                      style={{ maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <i className="fas fa-shirt fa-2x text-muted" />
                  )}
                </div>

                <div className="flex-grow-1">
                  <h6 className="mb-1">{item.name}</h6>
                  <p className="text-muted small mb-1">{[item.color, item.size].filter(Boolean).join(" · ")}</p>
                  <div className="font-weight-bold">{formatMoney(item.wsp)}</div>
                </div>

                <div className="mx-3">
                  <QuantitySelector
                    id={`cart-item-quantity-${item.productId}`}
                    value={item.quantity}
                    min={1}
                    max={item.maxQuantity}
                    onChange={(qty) => updateQuantity(item.productId, qty)}
                  />
                </div>

                <div className="text-right" style={{ minWidth: "100px" }}>
                  <div className="font-weight-bold mb-2">{formatMoney(item.wsp * item.quantity)}</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Link to={ROUTES.STORE.HOME} className="text-muted">
            <i className="fas fa-arrow-left mr-1" /> Continue shopping
          </Link>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Order Summary</h5>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between font-weight-bold mb-3">
                <span>Total</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <button
                id="proceed-to-checkout-button"
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => navigate(ROUTES.STORE.CHECKOUT)}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
