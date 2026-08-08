import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { checkoutSchema } from "@/features/checkout/checkout.schema"
import { placeOrderApi } from "@/features/checkout/checkout.api"
import { useMyProfile } from "@/features/checkout/hooks/use-my-profile"
import { PhoneField } from "@/components/ui/PhoneField"
import { PincodeField } from "@/components/ui/PincodeField"
import { useCartStore } from "@/store/cart.store"
import { useWarehouseDetails } from "@/hooks/use-warehouse-details"
import { formatMoney } from "@/lib/format"
import { setEffectivePrice } from "@/lib/pricing"
import { ROUTES } from "@/constants/routes"

export function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const { data: warehouse, isLoading: isLoadingWarehouse } = useWarehouseDetails()
  const { data: profile, isLoading: isLoadingProfile } = useMyProfile()

  // Captured once on mount (not read live) — guards against loading this page directly with an
  // empty cart, without re-triggering when a successful submit calls clearCart() and briefly
  // re-renders this still-mounted page before the navigate-away to the order page takes effect.
  const [cameInWithEmptyCart] = useState(() => items.length === 0)

  if (cameInWithEmptyCart) {
    return <Navigate to={ROUTES.STORE.CART} replace />
  }

  if (isLoadingProfile) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  // A customer who signed in with an OTP for a number we had never seen has an account and nothing
  // else — no name, no address. Browsing is fine without those; shipping an order is not, so this
  // is the point where finishing the profile stops being optional. `from` sends them straight back
  // here once they have.
  if (profile?.profileComplete === false) {
    return (
      <Navigate to={ROUTES.STORE.COMPLETE_PROFILE} state={{ from: ROUTES.STORE.CHECKOUT }} replace />
    )
  }

  return (
    <CheckoutForm items={items} profile={profile} warehouse={warehouse} isLoadingWarehouse={isLoadingWarehouse} />
  )
}

/**
 * Split out from CheckoutPage so the form's `defaultValues` (seeded from the customer's saved
 * profile — address should come from their personal details, not be re-typed every order) are
 * only built once the profile has actually loaded.
 */
function CheckoutForm({ items, profile, warehouse, isLoadingWarehouse }) {
  const clearCart = useCartStore((s) => s.clearCart)
  const navigate = useNavigate()

  // Stable for the lifetime of this checkout attempt — a resubmit (double-click, retry,
  // back-button) reuses the same key so the server returns the original order instead of
  // creating a duplicate.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [serverError, setServerError] = useState("")
  // Some items were already flagged as back-order when added to the cart (product was out of
  // stock at the time). A second case — stock sold out between add-to-cart and checkout — is
  // only discoverable from the 409 the server returns on submit: `stockRanOutOnSubmit` reveals
  // an explicit opt-in checkbox instead of forcing it on, so the customer still knowingly agrees.
  const [stockRanOutOnSubmit, setStockRanOutOnSubmit] = useState(false)
  const [backorderOptIn, setBackorderOptIn] = useState(false)

  const hasBackorderItems = items.some((item) => item.isBackorder)
  const allowBackorder = hasBackorderItems || backorderOptIn

  // item.price is per-piece; item.quantity counts sets (1 set = item.piecesPerSet pieces).
  const subtotal = items.reduce(
    (sum, item) => sum + setEffectivePrice(item.price, item.discountPercent, item.piecesPerSet ?? 1) * item.quantity,
    0
  )

  const form = useForm({
    defaultValues: {
      fullName: profile?.name ?? "",
      phone: profile?.phone ?? "",
      addressLine1: profile?.address ?? "",
      addressLine2: profile?.district ?? "",
      city: profile?.town ?? "",
      state: profile?.state ?? "",
      pincode: profile?.pincode ?? "",
      transactionId: "",
      notes: "",
    },
    validators: { onSubmit: checkoutSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const order = await placeOrderApi({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          transactionId: value.transactionId,
          shippingName: value.fullName,
          shippingPhone: value.phone,
          shippingAddressLine1: value.addressLine1,
          shippingAddressLine2: value.addressLine2,
          shippingCity: value.city,
          shippingState: value.state,
          shippingPincode: value.pincode,
          notes: value.notes,
          idempotencyKey,
          allowBackorder: allowBackorder || undefined,
        })
        // Navigate before clearing the cart — clearing first drops `items` to empty while
        // CheckoutPage is still mounted, which trips its own `items.length === 0` guard and
        // redirects to the cart page instead of the order confirmation.
        navigate(ROUTES.STORE.ORDER_DETAIL(order.id))
        clearCart()
      } catch (err) {
        if (err.response?.status === 409 && !allowBackorder) {
          setStockRanOutOnSubmit(true)
        }
        setServerError(err.response?.data?.message ?? "Could not place order. Please try again.")
      }
    },
  })

  return (
    <div>
      <h2 className="mb-4">Checkout</h2>

      {hasBackorderItems ? (
        <div className="alert alert-warning" id="checkout-backorder-notice">
          <i className="fas fa-triangle-exclamation mr-2" />
          Your cart includes item(s) that are currently out of stock. This order will be placed as a{" "}
          <strong>back-order</strong> — it ships once the item(s) are restocked.
        </div>
      ) : null}

      <div className="row">
        <div className="col-12 col-md-7">
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title float-none mb-3">Shipping Details</h5>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <form.Field name="fullName">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-full-name">Full name</label>
                      <input
                        id="checkout-full-name"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="phone">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-phone">Phone number</label>
                      <PhoneField id="checkout-phone" field={field} />
                    </div>
                  )}
                </form.Field>

                <form.Field name="addressLine1">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-address-line1">Address line 1</label>
                      <input
                        id="checkout-address-line1"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="addressLine2">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-address-line2">Address line 2 (optional)</label>
                      <input
                        id="checkout-address-line2"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>

                <div className="form-row">
                  <div className="form-group col-12 col-md-6">
                    <form.Field name="city">
                      {(field) => (
                        <>
                          <label htmlFor="checkout-city">City</label>
                          <input
                            id="checkout-city"
                            type="text"
                            className="form-control"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {field.state.meta.errors.length > 0 ? (
                            <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                          ) : null}
                        </>
                      )}
                    </form.Field>
                  </div>
                  <div className="form-group col-6 col-md-3">
                    <form.Field name="state">
                      {(field) => (
                        <>
                          <label htmlFor="checkout-state">State</label>
                          <input
                            id="checkout-state"
                            type="text"
                            className="form-control"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {field.state.meta.errors.length > 0 ? (
                            <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                          ) : null}
                        </>
                      )}
                    </form.Field>
                  </div>
                  <div className="form-group col-6 col-md-3">
                    <form.Field name="pincode">
                      {(field) => (
                        <>
                          <label htmlFor="checkout-pincode">Pincode</label>
                          <PincodeField id="checkout-pincode" field={field} />
                        </>
                      )}
                    </form.Field>
                  </div>
                </div>

                <hr />
                <h5 className="mb-3">Payment</h5>
                <p className="text-muted small">
                  Transfer the total amount to the bank account shown on the right, then enter the transaction
                  ID / UTR number from your bank below.
                </p>

                <form.Field name="transactionId">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-transaction-id">Bank transaction ID / UTR number</label>
                      <input
                        id="checkout-transaction-id"
                        type="text"
                        className="form-control"
                        maxLength={100}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <span className="text-danger small">{field.state.meta.errors[0]?.message}</span>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="notes">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="checkout-notes">Order notes (optional)</label>
                      <textarea
                        id="checkout-notes"
                        className="form-control"
                        rows={2}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </div>
                  )}
                </form.Field>

                {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

                {stockRanOutOnSubmit ? (
                  <div className="custom-control custom-checkbox mb-3">
                    <input
                      id="checkout-backorder-retry-checkbox"
                      type="checkbox"
                      className="custom-control-input"
                      checked={backorderOptIn}
                      onChange={(e) => setBackorderOptIn(e.target.checked)}
                    />
                    <label className="custom-control-label" htmlFor="checkout-backorder-retry-checkbox">
                      Order anyway — I&apos;m okay waiting for restock (back-order), then submit again
                    </label>
                  </div>
                ) : null}

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <button id="place-order-button" type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                      {isSubmitting ? "Placing order…" : "Place Order"}
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-5">
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title float-none">Account Details</h5>
              {isLoadingWarehouse ? (
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
              ) : warehouse ? (
                <dl className="mb-0 small">
                  {warehouse.bankName ? (
                    <>
                      <dt>Bank</dt>
                      <dd>{warehouse.bankName}</dd>
                    </>
                  ) : null}
                  {warehouse.accountHolderName ? (
                    <>
                      <dt>Account Holder</dt>
                      <dd>{warehouse.accountHolderName}</dd>
                    </>
                  ) : null}
                  {warehouse.accountNumber ? (
                    <>
                      <dt>Account Number</dt>
                      <dd id="checkout-account-number">{warehouse.accountNumber}</dd>
                    </>
                  ) : null}
                  {warehouse.ifscCode ? (
                    <>
                      <dt>IFSC Code</dt>
                      <dd>{warehouse.ifscCode}</dd>
                    </>
                  ) : null}
                  {warehouse.upiId ? (
                    <>
                      <dt>UPI ID</dt>
                      <dd>{warehouse.upiId}</dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="text-muted small mb-0">Bank details are not available right now.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title float-none">Order Summary</h5>
              {items.map((item) => {
                const isSet = Number(item.piecesPerSet) > 1
                const setUnitPrice = setEffectivePrice(item.price, item.discountPercent, item.piecesPerSet ?? 1)
                return (
                  <div key={item.productId} className="d-flex justify-content-between small mb-2">
                    <span>
                      {item.name} × {item.quantity}
                      {isSet ? ` set(s) of ${item.piecesPerSet}` : ""}
                    </span>
                    <span className="text-right">
                      {Number(item.discountPercent) > 0 ? (
                        <span className="text-muted mr-1">
                          <s>{formatMoney((isSet ? item.price * item.piecesPerSet : item.price) * item.quantity)}</s>
                        </span>
                      ) : null}
                      <span>{formatMoney(setUnitPrice * item.quantity)}</span>
                    </span>
                  </div>
                )
              })}
              <hr className="receipt-divider" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="font-weight-bold">Total</span>
                <span className="receipt-total">{formatMoney(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
