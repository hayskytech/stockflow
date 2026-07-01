import { create } from "zustand"

/** UI/client state for the products list page — filters only, no server data. */
export const useProductsStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  divisionFilter: "",
  setDivisionFilter: (divisionId) => set({ divisionFilter: divisionId, categoryFilter: "", subCategoryFilter: "" }),

  categoryFilter: "",
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId, subCategoryFilter: "" }),

  subCategoryFilter: "",
  setSubCategoryFilter: (subCategoryId) => set({ subCategoryFilter: subCategoryId }),
}))
