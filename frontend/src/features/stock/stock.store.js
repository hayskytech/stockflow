import { create } from "zustand"

/** UI/client state for the stock list page — filters only, no server data. */
export const useStockStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  statusFilter: "",
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  productFilter: "",
  setProductFilter: (productFilter) => set({ productFilter }),
}))
