import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  checkBarcodesApi,
  createStockApi,
  deleteStockApi,
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

// Import/delete change products.quantity_available too — invalidated by the products feature's
// query key string directly (see PRODUCTS_QUERY_KEY in products/hooks/use-products.js) since
// features never import each other's modules.
const PRODUCTS_QUERY_KEY = "products"

export function useImportStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
    },
  })
}

/** Commits a scan session — bulk-creates one stock row per scanned barcode. */
export function useCreateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
    },
  })
}

/** Advisory duplicate check for a batch of freshly scanned barcodes. */
export function useCheckBarcodes() {
  return useMutation({ mutationFn: checkBarcodesApi })
}

export function useDeleteStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStockApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
    },
  })
}
