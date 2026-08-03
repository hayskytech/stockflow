import { EmptyState } from "@/components/common/EmptyState"
import { ProductCard } from "@/components/common/ProductCard"
import { useDivisionOptions } from "@/hooks/use-catalog-options"
import { useHomeStore } from "@/features/home/home.store"
import { useStorefrontProducts } from "@/features/home/hooks/use-storefront-products"
import { HeroSlider } from "@/features/home/components/HeroSlider"
import { DivisionSection } from "@/features/home/components/DivisionSection"

/** Flat search-results grid, shown instead of the sectioned browse view whenever the
 *  customer has typed something into the storefront search box (StoreTopbar). */
function SearchResults({ search }) {
  const { data: products = [], isLoading, isError } = useStorefrontProducts({
    per_page: 100,
    is_active: "true",
    orderby: "name",
    order: "asc",
    search,
  })

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isError) {
    return <div className="alert alert-danger">Could not load products. Please try again.</div>
  }

  if (products.length === 0) {
    return <EmptyState icon="fa-shirt" title="No products found" description="Try a different search term." />
  }

  return (
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
  )
}

export function HomePage() {
  const search = useHomeStore((s) => s.search)
  const { data: divisions = [], isLoading, isError } = useDivisionOptions(true)

  return (
    <div>
      <HeroSlider />

      {search ? (
        <SearchResults search={search} />
      ) : isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger">Could not load the catalog. Please try again.</div>
      ) : divisions.length === 0 ? (
        <EmptyState icon="fa-shirt" title="No products yet" description="Check back soon for new arrivals." />
      ) : (
        divisions.map((division, index) => (
          <DivisionSection key={division.id} division={division} index={index} />
        ))
      )}
    </div>
  )
}
