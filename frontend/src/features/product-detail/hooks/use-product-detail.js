import { useQuery } from "@tanstack/react-query"
import { getStorefrontProductApi } from "@/features/product-detail/product-detail.api"

export const PRODUCT_DETAIL_QUERY_KEY = "storefrontProductDetail"

export function useProductDetail(id) {
  return useQuery({
    queryKey: [PRODUCT_DETAIL_QUERY_KEY, id],
    queryFn: () => getStorefrontProductApi(id),
    enabled: Boolean(id),
  })
}
