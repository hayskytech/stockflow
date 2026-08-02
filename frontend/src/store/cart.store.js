import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/constants/app"

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

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === product.id)
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: clampQuantity(item.quantity + quantity, product.quantityAvailable) }
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
                maxQuantity: product.quantityAvailable,
                quantity: clampQuantity(quantity, product.quantityAvailable),
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
