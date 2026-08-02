import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createSizeApi, deleteSizeApi, listSizesApi, reorderSizesApi, updateSizeApi } from "@/features/sizes/sizes.api"

export const SIZES_QUERY_KEY = "sizes"

export function useSizes(params) {
  return useQuery({
    queryKey: [SIZES_QUERY_KEY, params],
    queryFn: () => listSizesApi(params),
  })
}

export function useCreateSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSizeApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SIZES_QUERY_KEY] }),
  })
}

export function useUpdateSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateSizeApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SIZES_QUERY_KEY] }),
  })
}

export function useDeleteSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSizeApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SIZES_QUERY_KEY] }),
  })
}

export function useReorderSizes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderSizesApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SIZES_QUERY_KEY] }),
  })
}
