import { useQuery } from "@tanstack/react-query"
import { getUserApi } from "@/features/users/users.api"

export const USER_DETAIL_QUERY_KEY = "userDetail"

export function useUserDetail(id) {
  return useQuery({
    queryKey: [USER_DETAIL_QUERY_KEY, id],
    queryFn: () => getUserApi(id),
    enabled: Boolean(id),
  })
}
