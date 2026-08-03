import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  bulkImportDivisionsApi,
  createDivisionApi,
  deleteDivisionApi,
  getDivisionApi,
  listDivisionsApi,
  reorderDivisionsApi,
  updateDivisionApi,
} from "@/features/catalog/catalog.api"

export const DIVISIONS_QUERY_KEY = "divisions"
export const DIVISION_DETAIL_QUERY_KEY = "divisionDetail"

export function useDivisions(params) {
  return useQuery({
    queryKey: [DIVISIONS_QUERY_KEY, params],
    queryFn: () => listDivisionsApi(params),
  })
}

export function useDivision(id) {
  return useQuery({
    queryKey: [DIVISION_DETAIL_QUERY_KEY, id],
    queryFn: () => getDivisionApi(id),
    enabled: Boolean(id),
  })
}

export function useCreateDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDivisionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}

export function useBulkImportDivisions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bulkImportDivisionsApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}

export function useUpdateDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateDivisionApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [DIVISION_DETAIL_QUERY_KEY] })
    },
  })
}

export function useDeleteDivision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDivisionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}

export function useReorderDivisions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderDivisionsApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] }),
  })
}
