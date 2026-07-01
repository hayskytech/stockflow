import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createUserApi, deleteUserApi, listUsersApi, updateUserApi } from "@/features/users/users.api"

export const USERS_QUERY_KEY = "users"

export function useUsers(params) {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, params],
    queryFn: () => listUsersApi(params),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUserApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateUserApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] }),
  })
}
