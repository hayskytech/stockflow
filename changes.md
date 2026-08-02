- [x]  In product edit / add: Add discount field as percentage instead of WSP. This is a major change. we dont add mrp and wsp. we add price and discount. Discount will be in percentage.
- [x]  While creating new product: Keep `add stock` option. we can add initial stock.
- [x]  Create a seperate page for sizes. Admin should add pre-defined sizes. Only these sizes should be selected in product edit. Directly store **size** value in database instead of their id (primary key reference). In product edit: Keep size drop-down selector.
- [ ]  **Back orders or out of stock orders:** Even if product is out of stock, users should be able to make order. But this order is different from normal order. It should have all the fields same as order. But a small attribute to mention that, this is out of stock order. suggest any better for this kind of orders.
- [x]  Add a Notice board text scrolling in frontend store. It should be editable in dashboard.
- [x]  Frontend: Make `filter sidebar` colorful in store page. It is looking very dull and basic. add some background color.
- [x]  Create monthly reports about total orders and amount purchased.
- [x]  Remove **`Unit`** field from products. in this project we have only single kind of units. there are no different units like litres and meters. this is dresses related application, so unit means quantity / number. hence remove `Unit` field.

---

## Back-orders — implementation plan (do this in a separate session)

### Decision already made
Fulfillment model is **manual staff conversion** (confirmed with user): a back-order is not a new lifecycle state — it stays `pending` → `accepted` → `dispatched` → `completed` exactly like a normal order. It's just flagged so staff can find it. Staff clicks the *same* Accept button once real stock has landed; the existing accept-time hard stock check (`orders.service.js`, `updateOrderStatus`, status `'accepted'`, `FOR UPDATE` + `quantity_available >= quantity`) already 409s if stock still isn't there — so "converting" a back-order is just staff trying Accept again later. No new stock-triggered automation, no new statuses.

### Data model
- Add `orders.is_backorder BOOLEAN NOT NULL DEFAULT FALSE`.
- New migration `database/init/13_add_order_backorder_flag.sql` (`ALTER TABLE orders ADD COLUMN is_backorder ...`), and mirror the same column into `01_schema.sql`'s `CREATE TABLE orders` so a fresh install matches head (per this repo's migration rules in `CLAUDE.md`).
- Whole-order flag, not per-line. Simpler, and matches the original wording ("this order is different... a small attribute").

### Backend changes
- `orders.schema.js` — `createOrderSchema` gains an optional `allowBackorder: z.boolean().optional()`.
- `orders.service.js` `createOrder()`:
  - The existing soft availability check (`product.quantityAvailable < item.quantity` → pushed to `failures` → 409 if any failures) needs to branch: if `input.allowBackorder` is true, an insufficient-stock line is **not** pushed to `failures` — it's allowed through. Track whether *any* line was actually short; only set `is_backorder = true` on the order if at least one line genuinely needed it (so ticking the box speculatively on a fully-in-stock cart doesn't mislabel a normal order).
  - Products that are inactive or don't exist at all must still hard-fail regardless of `allowBackorder` — that flag is about *quantity* shortfalls only.
  - `INSERT INTO orders` gains the `is_backorder` column.
- `orders.service.js` — `ORDER_COLUMNS` / `listOrders()`: expose `o.is_backorder AS isBackorder`; add a whitelisted `filters.isBackorder` (`?is_backorder=true`) alongside the existing `status` filter, same pattern as `filters.status`.
- `updateOrderStatus()` (the `accepted` branch): **no change** — this is the whole point of the manual-conversion design; the existing hard check already does the right thing for free.

### Frontend changes
- `features/checkout/checkout.schema.js` / `CheckoutPage.jsx`: when a cart line's `quantity` exceeds the product's live `quantityAvailable`, show a notice plus an explicit "Order anyway — I'll wait for restock" checkbox instead of just letting the `POST /orders` 409 surface as a generic error. Submits `allowBackorder: true`.
- `features/orders/pages/NewOrderPage.jsx` (admin/staff manual order): same opt-in affordance, for phone/walk-in orders staff knowingly place against out-of-stock items.
- Order list pages (`features/orders/pages/OrdersPage.jsx`, `features/my-orders/`): add a "Back-order" badge/column, and a quick filter chip (alongside the existing status filter) so staff can find back-orders that might now be fulfillable.
- Order detail pages (`OrderDetailPage.jsx`, `MyOrderDetailPage.jsx`): show a clear "Back-order — awaiting restock" banner when `isBackorder` is true and status is still `pending`.
- `OrderStatusBadge` (or an adjacent small badge): visual indicator for back-order, without touching the underlying `status` enum/component.

### Open questions to confirm with the user before implementing (use AskUserQuestion)
1. **Opt-in UX** — does the customer explicitly tick a checkbox per out-of-stock line/cart, or is it auto-detected and silently allowed through? Recommend: explicit checkbox, so a customer is never surprised by a delayed order they didn't knowingly agree to.
2. **Partial backorders** — cart has 2 in-stock items + 1 out-of-stock item: one combined order (all lines ship together once everything is available), or split into a normal order + a separate back-order? Recommend: one combined order — matches "all the fields same as order," and avoids building order-splitting logic, which is a much bigger change.
3. **Staff visibility** — dedicated "Back-orders" nav page, or just a filter chip on the existing Orders page? Recommend: filter chip on the existing Orders page — smaller surface, consistent with how `status` filtering already works.
4. **Fulfillment nudge** — does staff get any signal when a backordered item's stock is replenished (e.g. a dashboard widget "3 backorders can now be fulfilled")? Recommend: defer for a first pass; the Orders page filter is enough for staff to check manually.

### Suggested implementation order
1. Migration + schema field (`is_backorder`), update `01_schema.sql`.
2. Backend: schema validation, `createOrder()` soft-check bypass, `listOrders()` filter.
3. Frontend: checkout opt-in UI, admin new-order opt-in UI.
4. Frontend: order list filter/badge, order detail banner.
5. Manual end-to-end test: place a back-order for an out-of-stock product, confirm Accept still 409s while under-stocked, add stock via Stock Import, confirm Accept then succeeds and the order proceeds through the normal dispatch flow untouched.
