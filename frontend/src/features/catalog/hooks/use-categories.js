import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createCategoryApi, deleteCategoryApi, listCategoriesApi, updateCategoryApi } from "@/features/catalog/catalog.api"

export const CATEGORIES_QUERY_KEY = "categories"

export function useCategories(params) {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY, params],
    queryFn: () => listCategoriesApi(params),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
  })
}
