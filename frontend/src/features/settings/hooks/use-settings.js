import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAllDataApi } from "@/features/settings/settings.api"

export function useDeleteAllData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAllDataApi,
    // Every cached list/detail in the app is now stale — invalidate everything.
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
