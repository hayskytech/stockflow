import { useQuery } from "@tanstack/react-query"
import { listCategoryCarouselProductsApi } from "@/features/home/home.api"

export const CATEGORY_CAROUSEL_PRODUCTS_QUERY_KEY = "categoryCarouselProducts"

export function useCategoryCarouselProducts(categoryId) {
  return useQuery({
    queryKey: [CATEGORY_CAROUSEL_PRODUCTS_QUERY_KEY, categoryId],
    queryFn: () => listCategoryCarouselProductsApi(categoryId),
    enabled: Boolean(categoryId),
  })
}
