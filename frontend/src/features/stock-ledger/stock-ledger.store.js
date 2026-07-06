import { create } from "zustand"

/** UI/client state for the stock ledger page — filters only, no server data. */
export const useStockLedgerStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  productFilter: "",
  setProductFilter: (productFilter) => set({ productFilter }),

  changeTypeFilter: "",
  setChangeTypeFilter: (changeTypeFilter) => set({ changeTypeFilter }),

  referenceTypeFilter: "",
  setReferenceTypeFilter: (referenceTypeFilter) => set({ referenceTypeFilter }),

  dateFrom: "",
  setDateFrom: (dateFrom) => set({ dateFrom }),

  dateTo: "",
  setDateTo: (dateTo) => set({ dateTo }),
}))
