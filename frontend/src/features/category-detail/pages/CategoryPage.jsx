import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useCategoryDetail } from "@/features/category-detail/hooks/use-category-detail"
import { useCategoryProducts } from "@/features/category-detail/hooks/use-category-products"
import { useCategoryDetailStore } from "@/features/category-detail/category-detail.store"
import { CategoryFilterBar } from "@/features/category-detail/components/CategoryFilterBar"
import { ProductCard } from "@/components/common/ProductCard"
import { EmptyState } from "@/components/common/EmptyState"
import { Pagination } from "@/components/common/Pagination"
import { ROUTES } from "@/constants/routes"

const PER_PAGE = 20

export function CategoryPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)

  const subCategoryFilter = useCategoryDetailStore((s) => s.subCategoryFilter)
  const minPrice = useCategoryDetailStore((s) => s.minPrice)
  const maxPrice = useCategoryDetailStore((s) => s.maxPrice)
  const clearFilters = useCategoryDetailStore((s) => s.clearFilters)

  useEffect(() => {
    setPage(1)
    clearFilters()
    // Only reset when navigating to a different category — not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    setPage(1)
  }, [subCategoryFilter, minPrice, maxPrice])

  const { data: category, isLoading: isLoadingCategory, isError: isCategoryError } = useCategoryDetail(id)
  const {
    data: { items: products, totalPages } = { items: [], totalPages: 1 },
    isLoading: isLoadingProducts,
    isError: isProductsError,
  } = useCategoryProducts(id, {
    page,
    per_page: PER_PAGE,
    orderby: "name",
    order: "asc",
    sub_category_id: subCategoryFilter || undefined,
    min_price: minPrice,
    max_price: maxPrice,
  })

  if (isLoadingCategory) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isCategoryError || !category) {
    return <div className="alert alert-danger">Could not load this category. It may no longer be available.</div>
  }

  const breadcrumb = category.divisionName ? (
    <Link to={ROUTES.STORE.DIVISION_DETAIL(category.divisionId)} className="text-muted small">
      {category.divisionName}
    </Link>
  ) : null

  return (
    <div id={`category-page-${category.id}`}>
      <Link to={ROUTES.STORE.HOME} className="text-muted small mb-3 d-inline-block">
        <i className="fas fa-arrow-left mr-1" /> Back to shopping
      </Link>

      {breadcrumb ? <p className="mb-1">{breadcrumb}</p> : null}
      <h2 className="mb-4">{category.name}</h2>

      <CategoryFilterBar categoryId={category.id} />

      {isLoadingProducts ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isProductsError ? (
        <div className="alert alert-danger">Could not load products. Please try again.</div>
      ) : products.length === 0 ? (
        <EmptyState icon="fa-shirt" title="No products found" description="Check back soon for new arrivals." />
      ) : (
        <>
          <div className="row">
            {products.map((product) => (
              <div key={product.id} className="col-6 col-md-3 mb-4">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
