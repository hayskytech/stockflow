import { useQuery } from "@tanstack/react-query"
import { listStorefrontProductsApi } from "@/features/home/home.api"

export const STOREFRONT_PRODUCTS_QUERY_KEY = "storefrontProducts"

export function useStorefrontProducts(params) {
  return useQuery({
    queryKey: [STOREFRONT_PRODUCTS_QUERY_KEY, params],
    queryFn: () => listStorefrontProductsApi(params),
  })
}
