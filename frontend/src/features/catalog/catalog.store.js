import { create } from "zustand"

/** UI/client state for the catalog pages — which division is selected as a filter. */
export const useCatalogStore = create((set) => ({
  categoryDivisionFilter: "",
  setCategoryDivisionFilter: (divisionId) => set({ categoryDivisionFilter: divisionId }),
}))
