import { Link } from "react-router-dom"
import { ProductCard } from "@/components/common/ProductCard"
import { useCategoryPreviewProducts } from "@/features/division-detail/hooks/use-category-preview-products"
import { ROUTES } from "@/constants/routes"

/** One category's preview section on the Division page: heading, up to 8 products,
 *  and a "View More" button through to that category's own paginated page. Fetches its own
 *  products so the Division page doesn't need to load every category's products upfront. */
export function CategorySection({ category }) {
  const { data: products = [], isLoading } = useCategoryPreviewProducts(category.id)

  if (!isLoading && products.length === 0) return null

  return (
    <section id={`division-category-section-${category.id}`} className="mb-5">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">{category.name}</h4>
        <Link
          id={`division-category-view-more-${category.id}`}
          to={ROUTES.STORE.CATEGORY_DETAIL(category.id)}
          className="btn btn-outline-primary btn-sm"
        >
          View More
          <i className="fas fa-arrow-right ml-2" />
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="row">
          {products.map((product) => (
            <div key={product.id} className="col-6 col-md-4 col-lg-3 mb-4">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
