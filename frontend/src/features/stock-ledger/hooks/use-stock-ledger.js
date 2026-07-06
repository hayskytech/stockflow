import { useQuery } from "@tanstack/react-query"
import { listStockLedgerApi } from "@/features/stock-ledger/stock-ledger.api"

export const STOCK_LEDGER_QUERY_KEY = "stockLedger"

export function useStockLedgerList(params) {
  return useQuery({
    queryKey: [STOCK_LEDGER_QUERY_KEY, params],
    queryFn: () => listStockLedgerApi(params),
  })
}
