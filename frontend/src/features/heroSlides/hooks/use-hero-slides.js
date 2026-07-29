import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createHeroSlideApi,
  deleteHeroSlideApi,
  listHeroSlidesApi,
  reorderHeroSlidesApi,
  updateHeroSlideApi,
} from "@/features/heroSlides/heroSlides.api"

export const HERO_SLIDES_QUERY_KEY = "heroSlides"

export function useHeroSlides(params) {
  return useQuery({
    queryKey: [HERO_SLIDES_QUERY_KEY, params],
    queryFn: () => listHeroSlidesApi(params),
  })
}

export function useCreateHeroSlide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createHeroSlideApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [HERO_SLIDES_QUERY_KEY] }),
  })
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateHeroSlideApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [HERO_SLIDES_QUERY_KEY] }),
  })
}

export function useDeleteHeroSlide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteHeroSlideApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [HERO_SLIDES_QUERY_KEY] }),
  })
}

export function useReorderHeroSlides() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderHeroSlidesApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [HERO_SLIDES_QUERY_KEY] }),
  })
}
