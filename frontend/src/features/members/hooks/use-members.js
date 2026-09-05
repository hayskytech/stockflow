import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addMemberApi,
  listMembersApi,
  removeMemberApi,
  updateMemberRoleApi,
} from "@/features/members/members.api"

/**
 * Query key is not prefixed with the business id: the Topbar business switcher does
 * `queryClient.clear()` on every switch, so the cache is already per-business.
 */
export const MEMBERS_QUERY_KEY = "members"

export function useMembers(params, options = {}) {
  return useQuery({
    queryKey: [MEMBERS_QUERY_KEY, params],
    queryFn: () => listMembersApi(params),
    ...options,
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addMemberApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] }),
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }) => updateMemberRoleApi(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeMemberApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] }),
  })
}
