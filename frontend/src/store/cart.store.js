import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/constants/app"

// A back-order line isn't bounded by live stock (that's the point) — cap it at something sane
// instead of leaving the stepper unbounded.
const BACKORDER_MAX_QUANTITY = 999

function clampQuantity(quantity, maxQuantity) {
  return Math.min(Math.max(1, quantity), Math.max(1, maxQuantity))
}

/** Customer shopping cart — client-owned, persisted to localStorage so it survives page refreshes. */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      ownerId: null,

      // Admin/staff share the same browser profile far more often than individual customers do
      // (a back-office terminal). Call this whenever the logged-in user is known so a leftover
      // cart from a previous session on the same machine never bleeds into the next one.
      syncOwner: (userId) => {
        if (get().ownerId !== userId) set({ ownerId: userId, items: [] });
      },

      // `isBackorder: true` is an explicit customer opt-in (checkbox on the product page) to add
      // more than `quantityAvailable` — the line ships once stock is replenished. It bypasses the
      // usual clamp-to-live-stock ceiling in favor of a generous fixed cap.
      addItem: (product, quantity = 1, { isBackorder = false } = {}) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === product.id)
          const maxQuantity = isBackorder ? BACKORDER_MAX_QUANTITY : product.quantityAvailable
          if (existing) {
            const nowBackorder = existing.isBackorder || isBackorder
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      isBackorder: nowBackorder,
                      maxQuantity: nowBackorder ? BACKORDER_MAX_QUANTITY : maxQuantity,
                      quantity: clampQuantity(item.quantity + quantity, nowBackorder ? BACKORDER_MAX_QUANTITY : maxQuantity),
                    }
                  : item
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                discountPercent: product.discountPercent,
                productPhotoUrl: product.productPhotoUrl,
                color: product.color,
                size: product.size,
                maxQuantity,
                isBackorder,
                quantity: clampQuantity(quantity, maxQuantity),
              },
            ],
          }
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity: clampQuantity(quantity, item.maxQuantity) } : item
          ),
        })),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),

      clearCart: () => set({ items: [] }),
    }),
    { name: STORAGE_KEYS.CART }
  )
)
