import { create } from "zustand"

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  mustChangePassword: false,
  /** Stays false until the initial silent refresh attempt on app load completes */
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken, mustChangePassword: user.mustChangePassword }),
  clearAuth: () => set({ user: null, accessToken: null, mustChangePassword: false }),
  clearMustChangePassword: () =>
    set((state) => ({
      mustChangePassword: false,
      user: state.user ? { ...state.user, mustChangePassword: false } : null,
    })),
  setInitialized: () => set({ isInitialized: true }),
}))
