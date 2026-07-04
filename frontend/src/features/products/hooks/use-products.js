import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createProductApi,
  deleteProductApi,
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

export function useImportProducts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importProductsApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] }),
  })
}
