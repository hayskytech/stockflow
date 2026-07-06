import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/constants/app"

/**
 * Dispatch scan session — the barcodes scanned so far against one order. Persisted so a
 * half-scanned dispatch survives an accidental refresh; cleared on successful dispatch,
 * discard, or when a different order's dispatch page is opened.
 *
 * Item `status` (from the advisory check; the dispatch call re-validates everything):
 *   'checking'      — queued for the advisory server check
 *   'matched'       — the unit reserved for this order
 *   'swap'          — in_stock unit of an ordered product (replaces a reserved unit)
 *   'wrong_product' — exists, but its product is not on this order
 *   'unavailable'   — reserved for another order or already dispatched
 *   'unknown'       — barcode not in stock
 *   'unverified'    — advisory check failed (network blip)
 */
export const useDispatchScanStore = create(
  persist(
    (set, get) => ({
      orderId: null,
      items: [],

      startSession: (orderId) => {
        if (get().orderId !== orderId) set({ orderId, items: [] })
      },
      endSession: () => set({ orderId: null, items: [] }),

      hasBarcode: (barcode) => get().items.some((item) => item.barcode === barcode),
      addItem: (barcode) => set((state) => ({ items: [{ barcode, status: "checking" }, ...state.items] })),
      removeItem: (barcode) => set((state) => ({ items: state.items.filter((item) => item.barcode !== barcode) })),

      /** Applies advisory check results — one entry per barcode with its server-side status. */
      applyCheckResults: (results) =>
        set((state) => ({
          items: state.items.map((item) => {
            const result = results.find((r) => r.barcode === item.barcode)
            return result ? { ...item, ...result } : item
          }),
        })),

      markUnverified: (barcodes) =>
        set((state) => ({
          items: state.items.map((item) =>
            barcodes.includes(item.barcode) && item.status === "checking" ? { ...item, status: "unverified" } : item
          ),
        })),

      removeProblems: () =>
        set((state) => ({
          items: state.items.filter((item) => !["wrong_product", "unavailable", "unknown"].includes(item.status)),
        })),
    }),
    { name: STORAGE_KEYS.DISPATCH_SCAN_SESSION }
  )
)
