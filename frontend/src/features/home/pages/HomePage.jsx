import { useMemo } from "react"
import { EmptyState } from "@/components/common/EmptyState"
import { useDivisionOptions } from "@/hooks/use-catalog-options"
import { useHomeStore } from "@/features/home/home.store"
import { useStorefrontProducts } from "@/features/home/hooks/use-storefront-products"
import { CategorySection } from "@/features/home/components/CategorySection"

/** Groups a flat product list into category sections, sorted alphabetically by category name. */
function groupByCategory(products) {
  const groups = new Map()
  for (const product of products) {
    const key = product.categoryName ?? "Uncategorized"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(product)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([categoryName, items]) => ({ categoryName, products: items }))
}

export function HomePage() {
  const search = useHomeStore((s) => s.search)
  const divisionFilter = useHomeStore((s) => s.divisionFilter)
  const setDivisionFilter = useHomeStore((s) => s.setDivisionFilter)

  const { data: divisions = [] } = useDivisionOptions()

  const { data: products = [], isLoading, isError } = useStorefrontProducts({
    per_page: 100,
    is_active: "true",
    orderby: "name",
    order: "asc",
    search: search || undefined,
    division_id: divisionFilter || undefined,
  })

  const sections = useMemo(() => groupByCategory(products), [products])

  return (
    <div>
      <div className="jumbotron jumbotron-fluid bg-white rounded shadow-sm py-4 px-4 mb-4">
        <h1 className="h3 mb-1">Shop our collection</h1>
        <p className="text-muted mb-0">Browse the latest dresses, sarees, kidware and menswear.</p>
      </div>

      <div className="mb-4 d-flex flex-wrap" style={{ gap: "0.5rem" }}>
        <button
          type="button"
          className={`btn btn-sm ${divisionFilter === "" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setDivisionFilter("")}
        >
          All
        </button>
        {divisions.map((division) => (
          <button
            key={division.id}
            type="button"
            className={`btn btn-sm ${divisionFilter === division.id ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDivisionFilter(division.id)}
          >
            {division.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger">Could not load products. Please try again.</div>
      ) : sections.length === 0 ? (
        <EmptyState
          icon="fa-shirt"
          title="No products found"
          description="Try a different search or category."
        />
      ) : (
        sections.map((section) => (
          <CategorySection key={section.categoryName} categoryName={section.categoryName} products={section.products} />
        ))
      )}
    </div>
  )
}
