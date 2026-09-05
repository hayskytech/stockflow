import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { API_ENDPOINTS } from "@/constants/api"
import { APP_NAME } from "@/constants/app"
import { formatMoney } from "@/lib/format"

/**
 * Read-only per-business settings (name/address/contact + phone/currency format + bank transfer
 * details) used by features outside the Business Settings page itself (e.g. Reports/Stock money
 * formatting). Hits the tenant-scoped `/business-settings` route — the axios interceptor prefixes
 * `/b/:businessId`, so this only works inside the business shell.
 */
export const BUSINESS_SETTINGS_QUERY_KEY = "businessSettings"

export function useBusinessSettings() {
  return useQuery({
    queryKey: [BUSINESS_SETTINGS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.BUSINESS_SETTINGS)
      return data
    },
  })
}

/** Updates the current business's settings (Business Settings page). */
export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input) => {
      const { data } = await apiClient.put(API_ENDPOINTS.BUSINESS_SETTINGS, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [BUSINESS_SETTINGS_QUERY_KEY] }),
  })
}

/**
 * Site title shown across the shell (browser tab, brand spots). Per-business branding is a later
 * phase (see multitenant_plan.md Phase 8); for now this is always the static app name so it can
 * be called from screens with no business context (login, error pages).
 */
export function useSiteTitle() {
  return APP_NAME
}

const DEFAULT_APP_SETTINGS = {
  phoneCountryCode: "+91",
  phoneNumberLength: 10,
  currencySymbol: "₹",
  currencyDecimalDigits: 2,
}

/** Per-business phone/currency format settings, with safe defaults while the query is pending. */
export function useAppSettings() {
  const { data } = useBusinessSettings()
  return {
    phoneCountryCode: data?.phoneCountryCode ?? DEFAULT_APP_SETTINGS.phoneCountryCode,
    phoneNumberLength: data?.phoneNumberLength ?? DEFAULT_APP_SETTINGS.phoneNumberLength,
    currencySymbol: data?.currencySymbol ?? DEFAULT_APP_SETTINGS.currencySymbol,
    currencyDecimalDigits: data?.currencyDecimalDigits ?? DEFAULT_APP_SETTINGS.currencyDecimalDigits,
  }
}

/** Bound money formatter using the current business's configured currency symbol/decimal digits. */
export function useFormatMoney() {
  const { currencySymbol, currencyDecimalDigits } = useAppSettings()
  return (value) => formatMoney(value, { symbol: currencySymbol, decimalDigits: currencyDecimalDigits })
}
