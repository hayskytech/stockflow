import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getWarehouseApi, updateWarehouseApi } from "@/features/warehouse/warehouse.api"

export const WAREHOUSE_QUERY_KEY = "warehouse"

export function useWarehouse() {
  return useQuery({
    queryKey: [WAREHOUSE_QUERY_KEY],
    queryFn: getWarehouseApi,
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateWarehouseApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [WAREHOUSE_QUERY_KEY] }),
  })
}
