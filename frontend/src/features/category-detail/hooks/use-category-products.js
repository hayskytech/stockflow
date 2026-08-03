import { useQuery } from "@tanstack/react-query"
import { listCategoryProductsApi } from "@/features/category-detail/category-detail.api"

export const CATEGORY_PRODUCTS_QUERY_KEY = "categoryProducts"

export function useCategoryProducts(categoryId, params) {
  return useQuery({
    queryKey: [CATEGORY_PRODUCTS_QUERY_KEY, categoryId, params],
    queryFn: () => listCategoryProductsApi(categoryId, params),
    enabled: Boolean(categoryId),
  })
}
