import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createStockBatchApi,
  deleteStockApi,
  downloadStockImportTemplateApi,
  getStockApi,
  importStockApi,
  listStockApi,
} from "@/features/stock/stock.api"

export const STOCK_QUERY_KEY = "stock"

export function useStockList(params) {
  return useQuery({
    queryKey: [STOCK_QUERY_KEY, params],
    queryFn: () => listStockApi(params),
  })
}

export function useStock(id) {
  return useQuery({
    queryKey: [STOCK_QUERY_KEY, id],
    queryFn: () => getStockApi(id),
    enabled: Boolean(id),
  })
}

// Import/create/delete change products.quantity_available and write stock_ledger rows too —
// invalidated by those features' query key strings directly (see PRODUCTS_QUERY_KEY in
// products/hooks/use-products.js and STOCK_LEDGER_QUERY_KEY in stock-ledger/hooks/
// use-stock-ledger.js) since features never import each other's modules.
const PRODUCTS_QUERY_KEY = "products"
const STOCK_LEDGER_QUERY_KEY = "stockLedger"

export function useImportStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
    },
  })
}

export function useDownloadStockImportTemplate() {
  return useMutation({ mutationFn: downloadStockImportTemplateApi })
}

/** Creates one stock intake batch against a product/invoice. */
export function useCreateStockBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createStockBatchApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
    },
  })
}

export function useDeleteStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
    },
  })
}
