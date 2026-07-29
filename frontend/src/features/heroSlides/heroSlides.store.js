import { create } from "zustand"

/** UI/client state for the Homepage Sliders admin page — no server data. */
export const useHeroSlidesStore = create((set) => ({
  showInactiveOnly: false,
  setShowInactiveOnly: (showInactiveOnly) => set({ showInactiveOnly }),
}))
