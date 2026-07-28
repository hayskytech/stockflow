import { useQuery } from "@tanstack/react-query"
import { listRelatedProductsApi } from "@/features/product-detail/product-detail.api"

export const RELATED_PRODUCTS_QUERY_KEY = "relatedProducts"

/** Up to 4 other active products in the same category as `productId`. */
export function useRelatedProducts(categoryId, productId) {
  return useQuery({
    queryKey: [RELATED_PRODUCTS_QUERY_KEY, categoryId, productId],
    queryFn: () => listRelatedProductsApi(categoryId),
    enabled: Boolean(categoryId),
    select: (products) => products.filter((p) => p.id !== productId).slice(0, 4),
  })
}
