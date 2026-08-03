import { useQuery } from "@tanstack/react-query"
import { listCategoryPreviewProductsApi } from "@/features/division-detail/division-detail.api"

export const CATEGORY_PREVIEW_PRODUCTS_QUERY_KEY = "categoryPreviewProducts"

export function useCategoryPreviewProducts(categoryId) {
  return useQuery({
    queryKey: [CATEGORY_PREVIEW_PRODUCTS_QUERY_KEY, categoryId],
    queryFn: () => listCategoryPreviewProductsApi(categoryId),
    enabled: Boolean(categoryId),
  })
}
