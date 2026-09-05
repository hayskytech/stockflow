import { create } from "zustand"

/**
 * Mirrors the `:businessId` segment of the current back-office URL so the axios request
 * interceptor (see `lib/axios.js`) can prefix tenant-scoped API paths without every
 * `.api.js` function having to thread a `businessId` argument through.
 *
 * The URL is the source of truth — `app/BusinessGate.jsx` keeps this store in sync with
 * the route param. Non-persisted: a full reload re-derives it from the URL.
 */
export const useBusinessStore = create((set) => ({
  currentBusinessId: null,
  setCurrentBusinessId: (id) => set({ currentBusinessId: id ?? null }),
}))
