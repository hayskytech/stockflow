import { EmptyState } from "@/components/common/EmptyState"
import { useHomeStore } from "@/features/home/home.store"
import { useStorefrontProducts } from "@/features/home/hooks/use-storefront-products"
import { ProductCard } from "@/components/common/ProductCard"
import { StoreSidebar } from "@/features/home/components/StoreSidebar"
import { HeroSlider } from "@/features/home/components/HeroSlider"

export function HomePage() {
  const search = useHomeStore((s) => s.search)
  const divisionFilter = useHomeStore((s) => s.divisionFilter)
  const categoryFilter = useHomeStore((s) => s.categoryFilter)
  const subCategoryFilter = useHomeStore((s) => s.subCategoryFilter)
  const minPrice = useHomeStore((s) => s.minPrice)
  const maxPrice = useHomeStore((s) => s.maxPrice)

  const { data: products = [], isLoading, isError } = useStorefrontProducts({
    per_page: 100,
    is_active: "true",
    orderby: "name",
    order: "asc",
    search: search || undefined,
    division_id: divisionFilter || undefined,
    category_id: categoryFilter || undefined,
    sub_category_id: subCategoryFilter || undefined,
    min_price: minPrice,
    max_price: maxPrice,
  })

  return (
    <div>
      <HeroSlider />

      <div className="row">
        <div className="col-md-3 mb-4">
          <StoreSidebar />
        </div>

        <div className="col-md-9">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : isError ? (
            <div className="alert alert-danger">Could not load products. Please try again.</div>
          ) : products.length === 0 ? (
            <EmptyState
              icon="fa-shirt"
              title="No products found"
              description="Try a different search or filter."
            />
          ) : (
            <>
              <div className="d-flex align-items-center justify-content-end mb-3">
                <span className="text-muted small">
                  {products.length} item{products.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="row">
                {products.map((product) => (
                  <div key={product.id} className="col-6 col-md-4 col-lg-3 mb-4">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
