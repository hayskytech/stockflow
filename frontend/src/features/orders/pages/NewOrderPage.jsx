import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { useProductOptions } from "@/hooks/use-product-options"
import { useUserOptions } from "@/hooks/use-user-options"
import { useCreateOrder } from "@/features/orders/hooks/use-orders"
import { manualOrderSchema } from "@/features/orders/orders.schema"
import { useFormatMoney } from "@/hooks/use-warehouse-details"
import { effectivePrice } from "@/lib/pricing"
import { PhoneField } from "@/components/ui/PhoneField"
import { PincodeField } from "@/components/ui/PincodeField"
import { SearchSelect } from "@/components/ui/SearchSelect"
import { ROUTES } from "@/constants/routes"

function TextField({ form, name, label, id, ...inputProps }) {
  return (
    <form.Field name={name}>
      {(field) => (
        <div className="form-group">
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            type="text"
            className="form-control"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            {...inputProps}
          />
          {field.state.meta.errors.length > 0 ? (
            <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
          ) : null}
        </div>
      )}
    </form.Field>
  )
}

/**
 * Manual order entry for walk-in/phone customers — admin/staff pick the customer, add the
 * product lines, and choose how payment was settled. Stock is checked for availability but
 * only reserved once the order is accepted, exactly as if the customer had ordered through
 * the storefront.
 */
export function NewOrderPage() {
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()
  const { data: users = [] } = useUserOptions()
  const { data: products = [] } = useProductOptions()
  const [serverError, setServerError] = useState("")
  const createOrder = useCreateOrder()

  // One idempotency key per page visit — a double-clicked submit can't create a duplicate order.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users])
  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products])

  const form = useForm({
    defaultValues: {
      requestedFor: "",
      items: [{ productId: "", quantity: 1 }],
      allowBackorder: false,
      paymentMethod: "offline",
      transactionId: "",
      shippingName: "",
      shippingPhone: "",
      shippingAddressLine1: "",
      shippingAddressLine2: "",
      shippingCity: "",
      shippingState: "",
      shippingPincode: "",
      notes: "",
    },
    validators: { onSubmit: manualOrderSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        const order = await createOrder.mutateAsync({
          requestedFor: value.requestedFor,
          items: value.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
          allowBackorder: value.allowBackorder || undefined,
          paymentMethod: value.paymentMethod,
          transactionId: value.paymentMethod === "bank_transfer" ? value.transactionId.trim() : undefined,
          shippingName: value.shippingName.trim(),
          shippingPhone: value.shippingPhone.trim(),
          shippingAddressLine1: value.shippingAddressLine1.trim(),
          shippingAddressLine2: value.shippingAddressLine2.trim() || undefined,
          shippingCity: value.shippingCity.trim(),
          shippingState: value.shippingState.trim(),
          shippingPincode: value.shippingPincode.trim(),
          notes: value.notes.trim() || undefined,
          idempotencyKey,
        })
        navigate(ROUTES.ORDERS.DETAIL(order.id))
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not create the order")
      }
    },
  })

  return (
    <PageWrapper>
      <PageHeader
        title="New Order"
        description="Manual order for a walk-in or phone customer — stock is reserved once accepted"
      />

      <form
        id="new-order-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="row">
          <div className="col-md-7">
            <div className="card">
              <div className="card-header">Customer & items</div>
              <div className="card-body">
                <form.Field name="requestedFor">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="new-order-customer">Order for</label>
                      <SearchSelect
                        id="new-order-customer"
                        placeholder="Choose a customer…"
                        value={field.state.value}
                        onChange={(value) => field.handleChange(value)}
                        options={activeUsers.map((user) => ({
                          value: user.id,
                          label: `${user.name} (${user.email})${user.role !== "customer" ? ` — ${user.role}` : ""}`,
                        }))}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="items" mode="array">
                  {(itemsField) => (
                    <div className="form-group mb-0">
                      <label>Items</label>
                      {itemsField.state.value.map((_, index) => (
                        <div className="row mb-2" key={index}>
                          <div className="col-7">
                            <form.Field name={`items[${index}].productId`}>
                              {(field) => (
                                <>
                                  <SearchSelect
                                    id={`new-order-product-${index}`}
                                    placeholder="Choose a product…"
                                    value={field.state.value}
                                    onChange={(value) => field.handleChange(value)}
                                    options={activeProducts.map((product) => ({
                                      value: product.id,
                                      label: `${product.name} — ${formatMoney(effectivePrice(product.price, product.discountPercent))}/pc${
                                        product.piecesPerSet > 1 ? ` (Set of ${product.piecesPerSet})` : ""
                                      } (${product.quantityAvailable} in stock)`,
                                    }))}
                                  />
                                  {field.state.meta.errors.length > 0 ? (
                                    <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                                  ) : null}
                                </>
                              )}
                            </form.Field>
                          </div>
                          <div className="col-3">
                            <form.Field name={`items[${index}].quantity`}>
                              {(field) => (
                                <>
                                  <input
                                    id={`new-order-quantity-${index}`}
                                    type="number"
                                    min={1}
                                    className="form-control"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                  />
                                  {field.state.meta.errors.length > 0 ? (
                                    <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                                  ) : null}
                                  <form.Subscribe selector={(state) => state.values.items[index]?.productId}>
                                    {(productId) => {
                                      const selected = activeProducts.find((p) => p.id === productId)
                                      return selected?.piecesPerSet > 1 ? (
                                        <small className="form-text text-muted">
                                          sets of {selected.piecesPerSet}
                                        </small>
                                      ) : null
                                    }}
                                  </form.Subscribe>
                                </>
                              )}
                            </form.Field>
                          </div>
                          <div className="col-2">
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              disabled={itemsField.state.value.length === 1}
                              onClick={() => itemsField.removeValue(index)}
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        id="new-order-add-item"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => itemsField.pushValue({ productId: "", quantity: 1 })}
                      >
                        <i className="fas fa-plus mr-1" />
                        Add item
                      </button>
                    </div>
                  )}
                </form.Field>

                <form.Field name="allowBackorder">
                  {(field) => (
                    <div className="custom-control custom-checkbox mt-3">
                      <input
                        id="new-order-allow-backorder"
                        type="checkbox"
                        className="custom-control-input"
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                      />
                      <label className="custom-control-label" htmlFor="new-order-allow-backorder">
                        Allow back-order — place this order even if an item doesn&apos;t have enough stock right now
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="card">
              <div className="card-header">Shipping details</div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <TextField form={form} name="shippingName" label="Full name" id="new-order-shipping-name" />
                  </div>
                  <div className="col-md-6">
                    <form.Field name="shippingPhone">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="new-order-shipping-phone">Phone</label>
                          <PhoneField id="new-order-shipping-phone" field={field} />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </div>
                <TextField form={form} name="shippingAddressLine1" label="Address line 1" id="new-order-address1" />
                <TextField form={form} name="shippingAddressLine2" label="Address line 2 (optional)" id="new-order-address2" />
                <div className="row">
                  <div className="col-md-4">
                    <TextField form={form} name="shippingCity" label="City" id="new-order-city" />
                  </div>
                  <div className="col-md-4">
                    <TextField form={form} name="shippingState" label="State" id="new-order-state" />
                  </div>
                  <div className="col-md-4">
                    <form.Field name="shippingPincode">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="new-order-pincode">Pincode</label>
                          <PincodeField id="new-order-pincode" field={field} />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card">
              <div className="card-header">Payment</div>
              <div className="card-body">
                <form.Field name="paymentMethod">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="new-order-payment-method">Payment method</label>
                      <select
                        id="new-order-payment-method"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      >
                        <option value="offline">Offline (cash / settled outside the app)</option>
                        <option value="bank_transfer">Bank transfer</option>
                      </select>
                    </div>
                  )}
                </form.Field>
                <form.Subscribe selector={(state) => state.values.paymentMethod}>
                  {(paymentMethod) =>
                    paymentMethod === "bank_transfer" ? (
                      <TextField
                        form={form}
                        name="transactionId"
                        label="Transaction ID / UTR"
                        id="new-order-transaction-id"
                        maxLength={100}
                      />
                    ) : null
                  }
                </form.Subscribe>
                <form.Field name="notes">
                  {(field) => (
                    <div className="form-group mb-0">
                      <label htmlFor="new-order-notes">Notes (optional)</label>
                      <textarea
                        id="new-order-notes"
                        className="form-control"
                        rows={3}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            {serverError ? (
              <div className="alert alert-danger" id="new-order-server-error">
                {serverError}
              </div>
            ) : null}

            <button
              type="submit"
              id="new-order-submit"
              className="btn btn-success btn-block"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Creating order…" : "Create order"}
            </button>
          </div>
        </div>
      </form>
    </PageWrapper>
  )
}
