import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"

/**
 * Creates one stock intake batch against a product/invoice. Lives outside any single feature
 * folder since more than one feature needs it (e.g. adding stock straight from the Product
 * detail page) — the Stock feature itself owns the full CRUD hooks for managing stock batches.
 *
 * Query keys are re-declared here as plain strings (not imported) because features never
 * import each other's modules — see the identical note in features/stock/hooks/use-stock.js.
 */
const STOCK_QUERY_KEY = "stock"
const PRODUCTS_QUERY_KEY = "products"
const STOCK_LEDGER_QUERY_KEY = "stockLedger"

export function useCreateStockBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.STOCK.CREATE, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
    },
  })
}
