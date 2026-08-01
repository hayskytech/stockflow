import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createProductApi,
  deleteProductApi,
  downloadProductImportTemplateApi,
  getProductApi,
  importProductsApi,
  listProductsApi,
  updateProductApi,
} from "@/features/products/products.api"

export const PRODUCTS_QUERY_KEY = "products"

export function useProducts(params) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, params],
    queryFn: () => listProductsApi(params),
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, id],
    queryFn: () => getProductApi(id),
    enabled: Boolean(id),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProductApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => updateProductApi(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] }),
  })
}

// Import can auto-create categories (and the GENERAL division) — invalidated by the
// catalog feature's key strings since features never import each other's modules.
const CATEGORIES_QUERY_KEY = "categories"
const DIVISIONS_QUERY_KEY = "divisions"

export function useImportProducts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importProductsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [DIVISIONS_QUERY_KEY] })
    },
  })
}

export function useDownloadProductImportTemplate() {
  return useMutation({ mutationFn: downloadProductImportTemplateApi })
}
