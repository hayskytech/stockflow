import { create } from "zustand"

/** UI/client state for the storefront home page — just the global search term (typed in
 *  StoreTopbar). Category/price filtering now lives on the Category page's own store, scoped
 *  to browsing one category, since the Home page is a sectioned division/category browse view
 *  rather than a filterable flat list. No server data. */
export const useHomeStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
}))
