import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryApi,
  listCategoriesApi,
  reorderCategoriesApi,
  updateCategoryApi,
} from "@/features/catalog/catalog.api"

export const CATEGORIES_QUERY_KEY = "categories"
export const CATEGORY_DETAIL_QUERY_KEY = "categoryDetail"

export function useCategories(params) {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY, params],
    queryFn: () => listCategoriesApi(params),
  })
}

export function useCategory(id) {
  return useQuery({
    queryKey: [CATEGORY_DETAIL_QUERY_KEY, id],
    queryFn: () => getCategoryApi(id),
    enabled: Boolean(id),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateCategoryApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [CATEGORY_DETAIL_QUERY_KEY] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ divisionId, orderedIds }) => reorderCategoriesApi(divisionId, orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
  })
}
