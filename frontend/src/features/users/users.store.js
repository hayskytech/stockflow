import { create } from "zustand"

/** UI/client state for the users list page — filters only, no server data. */
export const useUsersStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),

  roleFilter: "",
  setRoleFilter: (roleFilter) => set({ roleFilter }),
}))
