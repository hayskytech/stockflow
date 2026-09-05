import { create } from "zustand"

/** UI/client state for the catalog pages. Categories are top-level (no division parent),
 *  so there is currently no cross-component UI state to hold — list pagination lives in
 *  local component state. Kept as the feature's store entry point for when filters return. */
export const useCatalogStore = create(() => ({}))
