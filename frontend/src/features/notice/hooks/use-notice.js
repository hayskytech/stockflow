import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getNoticeApi, updateNoticeApi } from "@/features/notice/notice.api"
import { NOTICE_PUBLIC_QUERY_KEY } from "@/hooks/use-notice-public"

export const NOTICE_QUERY_KEY = "notice"

export function useNotice() {
  return useQuery({
    queryKey: [NOTICE_QUERY_KEY],
    queryFn: getNoticeApi,
  })
}

export function useUpdateNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateNoticeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTICE_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [NOTICE_PUBLIC_QUERY_KEY] })
    },
  })
}
