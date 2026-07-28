import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Read-only catalog reference data (divisions/categories/sub-categories) used to
 * populate pickers in other features (e.g. Products). Lives outside any single
 * feature folder since more than one feature needs it — the Catalog feature itself
 * owns the full CRUD hooks for managing this data on its own pages.
 */

export const CATALOG_OPTIONS_QUERY_KEY = "catalogOptions"

export function useDivisionOptions() {
  return useQuery({
    queryKey: [CATALOG_OPTIONS_QUERY_KEY, "divisions"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIVISIONS.LIST, { params: { per_page: 100, order: "asc" } })
      return data
    },
  })
}

export function useCategoryOptions(divisionId) {
  return useQuery({
    queryKey: [CATALOG_OPTIONS_QUERY_KEY, "categories", divisionId ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST, {
        params: { per_page: 100, division_id: divisionId || undefined, order: "asc" },
      })
      return data
    },
  })
}

export function useSubCategoryOptions(categoryId) {
  return useQuery({
    queryKey: [CATALOG_OPTIONS_QUERY_KEY, "subCategories", categoryId ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SUB_CATEGORIES.LIST, {
        params: { per_page: 100, category_id: categoryId || undefined, order: "asc" },
      })
      return data
    },
    enabled: Boolean(categoryId),
  })
}
