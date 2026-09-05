import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only catalog reference data (categories/sub-categories) used to
 * populate pickers in other features (e.g. Products). Lives outside any single
 * feature folder since more than one feature needs it — the Catalog feature itself
 * owns the full CRUD hooks for managing this data on its own pages.
 */

export const CATALOG_OPTIONS_QUERY_KEY = "catalogOptions"

/**
 * `isActive` is left undefined (no filter, admin sees everything including deactivated rows)
 * by default — callers browsing the public storefront pass `isActive: true` explicitly so
 * customers never see a deactivated category.
 */
export function useCategoryOptions(isActive) {
  return useQuery({
    queryKey: [CATALOG_OPTIONS_QUERY_KEY, "categories", isActive ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST, {
        params: { per_page: 100, order: "asc", is_active: isActive },
      })
      return data
    },
  })
}

export function useSubCategoryOptions(categoryId, isActive) {
  return useQuery({
    queryKey: [CATALOG_OPTIONS_QUERY_KEY, "subCategories", categoryId ?? null, isActive ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SUB_CATEGORIES.LIST, {
        params: { per_page: 100, category_id: categoryId || undefined, order: "asc", is_active: isActive },
      })
      return data
    },
    enabled: Boolean(categoryId),
  })
}
