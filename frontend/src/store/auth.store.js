import { create } from "zustand"

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  /** Stays false until the initial silent refresh attempt on app load completes */
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  /** Replaces the cached profile without touching the session — e.g. once an OTP-created account
   *  finishes its profile and `profileComplete` flips, mid-session. */
  setUser: (user) => set({ user }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setInitialized: () => set({ isInitialized: true }),
}))
