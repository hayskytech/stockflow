import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/constants/app"

/** UI/client state for the stock list page — filters only, no server data. */
export const useStockStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  // Defaults to in_stock so the day-to-day view shows only what's physically in the
  // warehouse — dispatched history is one filter change away, never deleted.
  statusFilter: "in_stock",
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  productFilter: "",
  setProductFilter: (productFilter) => set({ productFilter }),
}))

/**
 * Barcode-scan intake session. Persisted to localStorage so a half-scanned batch survives
 * an accidental refresh, a crash, or a re-login — cleared only on successful import/discard.
 *
 * `header` is the locked session form (product, invoice, per-unit defaults); `items` holds
 * one entry per scanned barcode, newest first. Item `status`:
 *   'checking'   — queued for the advisory server duplicate check
 *   'ok'         — server confirmed it doesn't exist yet
 *   'unverified' — check failed (network blip); the import call re-validates everything anyway
 *   'conflict'   — already exists in stock; must be removed before importing
 */
export const useScanSessionStore = create(
  persist(
    (set, get) => ({
      header: null,
      items: [],

      startSession: (header) => set({ header }),
      endSession: () => set({ header: null, items: [] }),

      hasBarcode: (barcode) => get().items.some((item) => item.barcode === barcode),
      addItem: (barcode) => set((state) => ({ items: [{ barcode, status: "checking" }, ...state.items] })),
      removeItem: (barcode) => set((state) => ({ items: state.items.filter((item) => item.barcode !== barcode) })),
      clearItems: () => set({ items: [] }),

      /** Applies a duplicate-check result: `existing` rows flip to conflict, the rest to ok. */
      markVerified: (barcodes, existing) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (!barcodes.includes(item.barcode) || item.status === "conflict") return item
            const conflict = existing.find((row) => row.barcode === item.barcode)
            return conflict
              ? { ...item, status: "conflict", conflictProduct: conflict.productName }
              : { ...item, status: "ok" }
          }),
        })),

      markUnverified: (barcodes) =>
        set((state) => ({
          items: state.items.map((item) =>
            barcodes.includes(item.barcode) && item.status === "checking" ? { ...item, status: "unverified" } : item
          ),
        })),

      /** Flags barcodes the import call rejected as already existing (409 details). */
      markConflicts: (barcodes) =>
        set((state) => ({
          items: state.items.map((item) =>
            barcodes.includes(item.barcode) ? { ...item, status: "conflict" } : item
          ),
        })),

      removeConflicts: () => set((state) => ({ items: state.items.filter((item) => item.status !== "conflict") })),
    }),
    { name: STORAGE_KEYS.SCAN_SESSION }
  )
)
