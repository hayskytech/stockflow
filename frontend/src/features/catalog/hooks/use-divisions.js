import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createDivisionApi, deleteDivisionApi, listDivisionsApi, updateDivisionApi } from "@/features/catalog/catalog.api"

export const DIVISIONS_QUERY_KEY = "divisions"

export function useDivisions(params) {
  return useQuery({
    queryKey: [DIVISIONS_QUERY_KEY, params],
    queryFn: () => listDivisionsApi(params),
  })
}

export function useCreateDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDivisionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}

export function useUpdateDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateDivisionApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}

export function useDeleteDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDivisionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}
