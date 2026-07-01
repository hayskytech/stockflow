import { create } from "zustand"

/** UI/client state for the media library page — filters only, no server data. */
export const useMediaStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  page: 1,
  setPage: (page) => set({ page }),
}))
