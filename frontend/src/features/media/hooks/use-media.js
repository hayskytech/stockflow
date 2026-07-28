import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  attachMediaUsageApi,
  deleteMediaApi,
  detachMediaUsageApi,
  getMediaApi,
  getMediaUsageApi,
  getRelatedMediaApi,
  listMediaApi,
  renameMediaApi,
  replaceMediaFileApi,
} from "@/features/media/media.api"

export const MEDIA_QUERY_KEY = "media"

export function useMediaList(params) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY, params],
    queryFn: () => listMediaApi(params),
  })
}

export function useMediaItem(id) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY, id],
    queryFn: () => getMediaApi(id),
    enabled: Boolean(id),
  })
}

export function useRenameMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, originalName }) => renameMediaApi(id, originalName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] }),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMediaApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] }),
  })
}

export function useMediaUsage(id) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY, id, "usage"],
    queryFn: () => getMediaUsageApi(id),
    enabled: Boolean(id),
  })
}

export function useRelatedMedia(id) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY, id, "related"],
    queryFn: () => getRelatedMediaApi(id),
    enabled: Boolean(id),
  })
}

export function useReplaceMediaFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }) => replaceMediaFileApi(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] }),
  })
}

export function useAttachMediaUsage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entityType, entityId }) => attachMediaUsageApi(id, entityType, entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] }),
  })
}

export function useDetachMediaUsage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entityType, entityId }) => detachMediaUsageApi(id, entityType, entityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] }),
  })
}
