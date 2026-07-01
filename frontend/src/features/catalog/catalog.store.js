import { create } from "zustand"

/** UI/client state for the catalog pages — which division/category is selected as a filter. */
export const useCatalogStore = create((set) => ({
  categoryDivisionFilter: "",
  setCategoryDivisionFilter: (divisionId) => set({ categoryDivisionFilter: divisionId }),

  selectedCategoryId: "",
  setSelectedCategoryId: (categoryId) => set({ selectedCategoryId: categoryId }),
}))
