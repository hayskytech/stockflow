import { create } from "zustand"

/** UI/client state for the admin orders list page — filters only, no server data. */
export const useOrdersStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  statusFilter: "",
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  backorderFilter: false,
  setBackorderFilter: (backorderFilter) => set({ backorderFilter }),

  dateFrom: "",
  setDateFrom: (dateFrom) => set({ dateFrom }),

  dateTo: "",
  setDateTo: (dateTo) => set({ dateTo }),
}))
