import { create } from "zustand"

/** UI/client state for the Category page — sub-category and price filters scoped to browsing
 *  a single category (division/category themselves are fixed by the route, not filterable
 *  here). No server data. */
export const useCategoryDetailStore = create((set) => ({
  subCategoryFilter: "",
  setSubCategoryFilter: (subCategoryId) => set({ subCategoryFilter: subCategoryId }),

  minPrice: undefined,
  maxPrice: undefined,
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),

  clearFilters: () => set({ subCategoryFilter: "", minPrice: undefined, maxPrice: undefined }),
}))
