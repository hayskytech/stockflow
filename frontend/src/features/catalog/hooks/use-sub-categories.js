import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createSubCategoryApi,
  deleteSubCategoryApi,
  listSubCategoriesApi,
  updateSubCategoryApi,
} from "@/features/catalog/catalog.api"

export const SUB_CATEGORIES_QUERY_KEY = "subCategories"

export function useSubCategories(params) {
  return useQuery({
    queryKey: [SUB_CATEGORIES_QUERY_KEY, params],
    queryFn: () => listSubCategoriesApi(params),
    enabled: params.categoryId !== undefined && params.categoryId !== "",
  })
}

export function useCreateSubCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSubCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUB_CATEGORIES_QUERY_KEY] }),
  })
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateSubCategoryApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUB_CATEGORIES_QUERY_KEY] }),
  })
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSubCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUB_CATEGORIES_QUERY_KEY] }),
  })
}
