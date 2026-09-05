import { create } from "zustand"

/** UI/client state for the products list page — filters only, no server data. */
export const useProductsStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  categoryFilter: "",
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId, subCategoryFilter: "" }),

  subCategoryFilter: "",
  setSubCategoryFilter: (subCategoryId) => set({ subCategoryFilter: subCategoryId }),
}))
