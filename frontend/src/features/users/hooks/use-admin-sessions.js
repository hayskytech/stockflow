import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listAllSessionsApi,
  revokeAllSessionsForUserApi,
  revokeAnySessionApi,
} from "@/features/users/users.api"

export const ADMIN_SESSIONS_QUERY_KEY = "adminSessions"

/**
 * Admin: active sessions across every user. Pass `{ user_id }` in `params` to scope to one user
 * (the UserView "Sessions" tab) — omit it for the global all-sessions view. Pass
 * `{ enabled: false }` to defer fetching, e.g. while a tab isn't the active one.
 */
export function useAdminSessions(params, { enabled } = {}) {
  return useQuery({
    queryKey: [ADMIN_SESSIONS_QUERY_KEY, params],
    queryFn: () => listAllSessionsApi(params),
    enabled,
  })
}

export function useRevokeAnySession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeAnySessionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ADMIN_SESSIONS_QUERY_KEY] }),
  })
}

/** "Force logout everywhere" for one user — revokes every active session they hold. */
export function useForceLogoutUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeAllSessionsForUserApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ADMIN_SESSIONS_QUERY_KEY] }),
  })
}
