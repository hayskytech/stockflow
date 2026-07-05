import { create } from "zustand"

/** UI/client state for the storefront home page — search, category filters, and price range. No server data. */
export const useHomeStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  divisionFilter: "",
  // Picking a new division clears the category/sub-category filters scoped to the previous division.
  setDivisionFilter: (divisionId) => set({ divisionFilter: divisionId, categoryFilter: "", subCategoryFilter: "" }),

  categoryFilter: "",
  // Picking a new category clears the sub-category filter scoped to the previous category.
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId, subCategoryFilter: "" }),

  subCategoryFilter: "",
  setSubCategoryFilter: (subCategoryId) => set({ subCategoryFilter: subCategoryId }),

  minPrice: undefined,
  maxPrice: undefined,
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),

  clearFilters: () =>
    set({
      divisionFilter: "",
      categoryFilter: "",
      subCategoryFilter: "",
      minPrice: undefined,
      maxPrice: undefined,
    }),
}))
