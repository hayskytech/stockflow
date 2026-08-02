# Feature: Sell products as a "set" (pieces per set)

## Original request

> Add field: pieces in product edit page. In our project we have products as "set of items". For
> example: a product name is "Shirt", in that we have 3 shirts. So admin will enter single item
> price, system should calculate and show multiplied price also. User must order 3 items only.
> Means if he adds the product to cart, we should show one product in cart, along with that show:
> "set of 3".

## Decisions confirmed with the user

1. **Stock unit = sets, not physical pieces.** `products.quantity_available` /
   `quantity_reserved` (and everything derived from them — Stock Import quantity, reorder level,
   low-stock reports, order reservation, dispatch, `stock_ledger`) keep counting in the exact same
   unit they do today. For a set product that unit is now "1 set". Nothing about how stock is
   received, reserved, dispatched, or ledgered changes — a set product is just a product whose
   single countable unit happens to contain N physical pieces.
   - Consequence: **no changes needed anywhere in stock reservation/dispatch/ledger logic**, and
     no changes to how order quantity is validated — an order for `quantity: 1` on a set product
     already means "1 set", exactly matching the original ask ("if he adds the product to cart, we
     should show one product in cart"). "Pieces" is a pure multiplier used only for price and
     label display.
2. **`pieces_per_set` is a per-product field, default `1`.** Every existing product is unaffected
   (behaves exactly as today, no "set" badge shown). Admin opts a specific product into set-selling
   by setting this to e.g. `3` on that product's edit page.

## Data model

New column on `products`, plus a snapshot column on `order_items` (mirrors the existing
`price_at_order` / `discount_percent_at_order` pattern — an order placed while a product was
"set of 3" must keep showing 3 even if the admin later edits that product to "set of 5").

**`database/init/14_add_products_pieces_per_set.sql`** (new migration, continuing after `13_add_order_backorder_flag.sql`):

```sql
ALTER TABLE products
  ADD COLUMN pieces_per_set TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Physical pieces in one sellable unit — e.g. 3 for a "set of 3" shirt. 1 = sold as a single item' AFTER size,
  ADD CONSTRAINT chk_products_pieces_per_set_pos CHECK (pieces_per_set >= 1);

ALTER TABLE order_items
  ADD COLUMN pieces_per_set_at_order TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Snapshot of products.pieces_per_set at order time — price_at_order stays per-piece, this is what multiplies it for display' AFTER discount_percent_at_order;
```

Also update `database/init/01_schema.sql` in place so a fresh install already matches head:
add `pieces_per_set` to the `products` `CREATE TABLE` (with the same CHECK constraint) and
`pieces_per_set_at_order` to `order_items`.

## Backend changes

### `backend/src/modules/products/products.schema.js`
- Add `piecesPerSet: z.number().int().min(1, 'Must be at least 1').max(100, 'Must be 100 or less').default(1)` to `createProductSchema`.
- Add the same field as `.optional()` to `updateProductSchema`.

### `backend/src/modules/products/products.service.js`
- `PRODUCT_COLUMNS`: add `p.pieces_per_set AS piecesPerSet`.
- `createProduct`: add `pieces_per_set` to the INSERT column list/values (`input.piecesPerSet ?? 1`).
- `updateProduct`: add `piecesPerSet: 'pieces_per_set'` to `columnMap`.
- No change to `quantity_available` handling, stock intake linkage, or any pricing/filter query —
  `minPrice`/`maxPrice` filters intentionally continue to operate on per-piece `price`, not the
  multiplied set price.

### `backend/src/modules/orders/orders.schema.js` / `orders.service.js`
- No change to `createOrderSchema` (quantity is already "how many units of this product", which is
  now correctly "how many sets" for a set product — no new multiple-of validation needed).
- `createOrder`: when inserting into `order_items`, also insert `pieces_per_set_at_order` from the
  product row already fetched in the reservation-check loop (`product.piecesPerSet` — add
  `pieces_per_set AS piecesPerSet` to that inner `SELECT` too).
- `getOrderById`: add `oi.pieces_per_set_at_order AS piecesPerSetAtOrder` to the `order_items`
  SELECT so order detail views can render "N set(s) of M · = (N×M) pcs".

### `backend/src/modules/stock/*`
- No functional change. `stock.quantity` already means "sets" for a set product under the
  confirmed semantics.
- Optional UX nicety (not required): `stock.service.js`'s product join could expose
  `pieces_per_set` so the frontend Stock intake form can show a "= 30 pieces" hint next to the
  quantity input, purely to stop an admin from misreading the field. Flagged as a stretch item —
  do it only if time allows, see Frontend section.

## Frontend changes

### `frontend/src/lib/pricing.js`
Add one small helper next to `effectivePrice` — the single source of truth for the multiplication,
reused by every screen below instead of each one re-deriving it:

```js
/** What one full set costs — effectivePrice() multiplied by how many pieces are in a set. */
export function setEffectivePrice(price, discountPercent, piecesPerSet) {
  return effectivePrice(price, discountPercent) * piecesPerSet
}
```

### `frontend/src/components/ui/SetBadge.jsx` (new)
Mirrors the existing `BackorderBadge.jsx` pattern exactly:
```jsx
export function SetBadge({ piecesPerSet }) {
  return <span className="badge badge-info">Set of {piecesPerSet}</span>
}
```
Rendered only when `piecesPerSet > 1` — every call site below guards on that.

### `frontend/src/features/products/products.schema.js` + `ProductFormPage.jsx`
- Schema: add `piecesPerSet: z.coerce.number().int().min(1).max(100).default(1)`.
- Form: new field next to Price/Discount in the "Pricing & Stock" section — `NumberField` labeled
  "Pieces per Set" with an `InfoTooltip` ("How many physical pieces make up one sellable
  unit/order. Leave at 1 for a single item."). Below it, a live read-only computed line using
  `form.Subscribe` over `price`, `discountPercent`, `piecesPerSet`: "Set price: ₹X (₹Y/piece)"
  shown only when `piecesPerSet > 1`.
- `defaultValues`: `piecesPerSet: product?.piecesPerSet ?? 1`.

### `frontend/src/components/common/ProductCard.jsx`
- Show `<SetBadge piecesPerSet={product.piecesPerSet} />` next to the stock badge when
  `product.piecesPerSet > 1`.
- Price block: keep showing per-piece effective price as today (unchanged), it's the catalog tile —
  full set pricing detail belongs on the detail page to avoid crowding the card.

### `frontend/src/features/product-detail/pages/ProductDetailPage.jsx`
- Next to the price block: when `piecesPerSet > 1`, show both the per-piece price and, via
  `setEffectivePrice`, the set price, e.g. "₹450 (₹150 × 3 pcs)" plus a `<SetBadge>`.
- Quantity selector: label changes from "Quantity" to "Quantity (sets)" when `piecesPerSet > 1`,
  and a small helper line under it: "= {quantity * piecesPerSet} pieces".
- `handleAddToCart`: unchanged call shape (`addItem(product, quantity, {...})`) — `product` already
  carries `piecesPerSet` through to the cart store (see below).

### `frontend/src/store/cart.store.js`
- `addItem`: persist `piecesPerSet: product.piecesPerSet ?? 1` onto the stored cart item (same
  place `color`/`size` are copied today). No change to `maxQuantity`/`clampQuantity` — those
  already operate correctly in "sets" units since `product.quantityAvailable` already means sets.

### `frontend/src/features/cart/pages/CartPage.jsx`
- Next to the existing `Back-order` badge, render `<SetBadge piecesPerSet={item.piecesPerSet} />`
  when `item.piecesPerSet > 1`.
- Price column: use `setEffectivePrice(item.price, item.discountPercent, item.piecesPerSet)` as the
  per-line unit price shown, with a small "(₹{effectivePrice}/pc)" caption when `piecesPerSet > 1`.
  Line total math (`effectivePrice(...) * item.quantity`) is already correct in aggregate since
  `item.quantity` is sets and price-per-piece × pieces-per-set × sets is the same number either way
  — only the per-line *display* needs the set-aware helper, not the subtotal/total calculation.

### `frontend/src/features/checkout/pages/CheckoutPage.jsx`
- Order Summary rows: change `{item.name} × {item.quantity}` to include set wording when
  `item.piecesPerSet > 1`, e.g. `{item.name} × {item.quantity} set(s) of {item.piecesPerSet}`.
- Subtotal/Total math unchanged (see note above — already correct).

### `frontend/src/features/orders/pages/NewOrderPage.jsx` (admin/staff manual order)
- Product picker label: append `" — Set of N"` when the selected product's `piecesPerSet > 1`, so
  staff know a quantity of `1` means one full set, not one shirt.
- No change to the quantity `<input type="number">` itself or to `manualOrderSchema` — same
  reasoning as the customer checkout path (quantity is already in the correct unit).

### `frontend/src/features/orders/pages/OrderDetailPage.jsx` and `frontend/src/features/my-orders/pages/MyOrderDetailPage.jsx`
- Items table: Qty column becomes `{item.quantity}` plus, when `item.piecesPerSetAtOrder > 1`, a
  muted sub-line `set of {item.piecesPerSetAtOrder} · {item.quantity * item.piecesPerSetAtOrder} pcs`.
- Product name cell: render `<SetBadge piecesPerSet={item.piecesPerSetAtOrder} />` next to the name
  when applicable (uses the *order-time* snapshot, not the live product, so old orders stay accurate
  even if the product's set size changes later).

### `frontend/src/features/orders/pages/OrdersPage.jsx` / `frontend/src/features/my-orders/pages/MyOrdersPage.jsx`
- These are order-level list rows (order number, status, total) with no per-line-item display —
  expected to need **no changes**. Verify while implementing; only touch if a per-item quantity
  actually renders there.

### `frontend/src/features/orders/orders.api.js` / hooks
- No changes expected — these already pass through whatever the backend returns.

### Optional stretch: Stock intake hint
- `frontend/src/features/stock/...` intake form: if `stock.service.js` is extended to expose the
  product's `piecesPerSet` (see Backend section), show a small "= {quantity * piecesPerSet} pieces"
  caption next to the Stock quantity field when the selected product is a set product, purely to
  stop data-entry confusion. Not required for the core feature to work.

## Validation / edge cases

- `piecesPerSet` is a positive integer, 1–100 (mirrors the existing `reorderLevel`-style int
  bounds) — enforced identically in both `products.schema.js` (backend) and
  `products.schema.js` (frontend), per the project's client/server schema-parity rule.
- Existing products default to `1` via the migration — zero visible change for any product that
  isn't explicitly opted in.
- `price` keeps meaning "price per single piece" everywhere it's stored — the set price is always
  *derived*, never persisted, exactly like `effectivePrice` today.
- Changing `piecesPerSet` on a product with existing pending/accepted orders does **not** retroactively
  change those orders' display, because `order_items.pieces_per_set_at_order` is snapshotted at
  order-creation time.
- Cart items already in a customer's browser (`localStorage`) from before this change won't have a
  `piecesPerSet` field — guard every read with `item.piecesPerSet ?? 1` so old persisted carts don't
  break.

## Migration & rollout order

1. `database/init/14_add_products_pieces_per_set.sql` + update `01_schema.sql`.
2. Backend: products schema/service, orders service (snapshot column + join).
3. Frontend: `lib/pricing.js` helper + `SetBadge` first (shared primitives), then product form,
   product card/detail, cart store/page, checkout, admin order pages, new-order page.
4. Manual test pass (see below) before considering it done — no automated test suite in this repo.

## Manual test checklist

- Admin: create a product with `Pieces per Set = 3`, price `₹150` → form shows "Set price: ₹450".
- Admin: existing products still show `Pieces per Set = 1` and no set UI anywhere.
- Storefront: product card/detail for the set product shows the `Set of 3` badge and set price.
- Add to cart with quantity `1` → cart shows **one line**, quantity stepper starts at `1`, badge
  "Set of 3", price reflects 3 pieces.
- Checkout → order confirmation → admin Order Detail — quantity/pieces breakdown consistent end to
  end; verify `stock.quantity_available` decremented by `1` (one set), not `3`, on acceptance.
- Admin manual order (`NewOrderPage`) with a set product — product picker shows "Set of 3" hint.
- Edit the product afterwards to `Pieces per Set = 5` — the already-placed order still shows "Set of
  3" (snapshot), while the product page now shows "Set of 5" for new orders.
- Regression: a normal (non-set) product flows through cart/checkout/order exactly as before, no
  stray "Set of 1" badges anywhere.
