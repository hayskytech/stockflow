import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  checkDispatchBarcodesApi,
  createDispatchApi,
  getDispatchApi,
  getDispatchOrderApi,
  importDispatchApi,
  listDispatchesApi,
} from "@/features/dispatches/dispatches.api"

export const DISPATCHES_QUERY_KEY = "dispatches"

// Dispatching flips the order to 'dispatched', moves stock units, and writes ledger rows —
// invalidated by key string since features never import each other's modules.
const ORDERS_QUERY_KEY = "orders"
const STOCK_QUERY_KEY = "stock"
const STOCK_LEDGER_QUERY_KEY = "stockLedger"
const PRODUCTS_QUERY_KEY = "products"

export function useDispatches(params) {
  return useQuery({
    queryKey: [DISPATCHES_QUERY_KEY, params],
    queryFn: () => listDispatchesApi(params),
  })
}

export function useDispatch(id) {
  return useQuery({
    queryKey: [DISPATCHES_QUERY_KEY, id],
    queryFn: () => getDispatchApi(id),
    enabled: Boolean(id),
  })
}

/** The order being dispatched — cached under the orders key so both features stay in sync. */
export function useDispatchOrder(orderId) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, orderId],
    queryFn: () => getDispatchOrderApi(orderId),
    enabled: Boolean(orderId),
  })
}

function invalidateAfterDispatch(queryClient) {
  queryClient.invalidateQueries({ queryKey: [DISPATCHES_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [STOCK_LEDGER_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
}

/** Commits a dispatch scan session — all-or-nothing on the server. */
export function useCreateDispatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDispatchApi,
    onSuccess: () => invalidateAfterDispatch(queryClient),
  })
}

/** Advisory per-barcode check for a batch of freshly scanned barcodes against an order. */
export function useCheckDispatchBarcodes() {
  return useMutation({
    mutationFn: ({ orderId, barcodes }) => checkDispatchBarcodesApi(orderId, barcodes),
  })
}

export function useImportDispatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importDispatchApi,
    onSuccess: () => invalidateAfterDispatch(queryClient),
  })
}
