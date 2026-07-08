import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"
import { APP_NAME } from "@/constants/app"

/**
 * Read-only warehouse settings (name/address/contact + bank transfer details) used by other
 * features (e.g. Checkout, to show bank details for payment). Lives outside any single feature
 * folder since more than one feature needs it — the Warehouse feature itself owns the full
 * read/write hooks for managing this data on its own settings page.
 */
export const WAREHOUSE_DETAILS_QUERY_KEY = "warehouseDetails"

export function useWarehouseDetails() {
  return useQuery({
    queryKey: [WAREHOUSE_DETAILS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.WAREHOUSE)
      return data
    },
  })
}

/**
 * Public name-only subset for unauthenticated screens (login/register site title) — hits
 * `/warehouse/public` instead of `/warehouse` since that route needs no session and never
 * returns bank details.
 */
export const WAREHOUSE_PUBLIC_QUERY_KEY = "warehousePublic"

export function useWarehousePublicInfo() {
  return useQuery({
    queryKey: [WAREHOUSE_PUBLIC_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.WAREHOUSE_PUBLIC)
      return data
    },
  })
}

/** Site title shown across the UI (browser tab, brand/logo spots) — the configured warehouse
 *  name, falling back to the default app name when settings haven't been configured yet. */
export function useSiteTitle() {
  const { data } = useWarehousePublicInfo()
  return data?.name || APP_NAME
}
