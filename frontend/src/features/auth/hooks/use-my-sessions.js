import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listMySessionsApi, revokeMySessionApi } from "@/features/auth/auth.api"

export const MY_SESSIONS_QUERY_KEY = "mySessions"

export function useMySessions() {
  return useQuery({
    queryKey: [MY_SESSIONS_QUERY_KEY],
    queryFn: listMySessionsApi,
  })
}

export function useRevokeMySession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeMySessionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_SESSIONS_QUERY_KEY] }),
  })
}
