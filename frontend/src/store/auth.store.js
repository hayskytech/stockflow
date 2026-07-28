import { create } from "zustand"

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  /** Stays false until the initial silent refresh attempt on app load completes */
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setInitialized: () => set({ isInitialized: true }),
}))
