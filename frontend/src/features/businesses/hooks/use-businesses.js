import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createBusinessApi,
  deactivateBusinessApi,
  getBusinessApi,
  listBusinessMembersApi,
  listBusinessesApi,
  updateBusinessApi,
} from "@/features/businesses/businesses.api"

export const BUSINESSES_QUERY_KEY = "businesses"
export const BUSINESS_DETAIL_QUERY_KEY = "businessDetail"
export const BUSINESS_MEMBERS_QUERY_KEY = "businessMembers"

export function useBusinesses(params) {
  return useQuery({
    queryKey: [BUSINESSES_QUERY_KEY, params],
    queryFn: () => listBusinessesApi(params),
  })
}

export function useBusiness(id) {
  return useQuery({
    queryKey: [BUSINESS_DETAIL_QUERY_KEY, id],
    queryFn: () => getBusinessApi(id),
    enabled: Boolean(id),
  })
}

export function useBusinessMembers(id, params, options = {}) {
  return useQuery({
    queryKey: [BUSINESS_MEMBERS_QUERY_KEY, id, params],
    queryFn: () => listBusinessMembersApi(id, params),
    enabled: Boolean(id),
    ...options,
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBusinessApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [BUSINESSES_QUERY_KEY] }),
  })
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }) => updateBusinessApi(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [BUSINESSES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [BUSINESS_DETAIL_QUERY_KEY, id] })
    },
  })
}

export function useDeactivateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deactivateBusinessApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [BUSINESSES_QUERY_KEY] }),
  })
}
