import { useQuery } from "@tanstack/react-query"
import { getMyProfileApi } from "@/features/checkout/checkout.api"

export const MY_PROFILE_QUERY_KEY = "checkoutMyProfile"

export function useMyProfile() {
  return useQuery({
    queryKey: [MY_PROFILE_QUERY_KEY],
    queryFn: getMyProfileApi,
  })
}
