import { useQuery } from "@tanstack/react-query"
import { getStorefrontCategoryApi } from "@/features/category-detail/category-detail.api"

export const CATEGORY_DETAIL_QUERY_KEY = "storefrontCategoryDetail"

export function useCategoryDetail(id) {
  return useQuery({
    queryKey: [CATEGORY_DETAIL_QUERY_KEY, id],
    queryFn: () => getStorefrontCategoryApi(id),
    enabled: Boolean(id),
  })
}
