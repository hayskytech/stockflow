import { create } from "zustand"

/** UI/client state for the storefront home page — search + division filter only, no server data. */
export const useHomeStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  divisionFilter: "",
  setDivisionFilter: (divisionId) => set({ divisionFilter: divisionId }),
}))
