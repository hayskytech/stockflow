import { useCategoryCarouselProducts } from "@/features/home/hooks/use-category-carousel-products"
import { ProductCarousel } from "@/features/home/components/ProductCarousel"
import { ROUTES } from "@/constants/routes"

/** One category's carousel row inside a Division section on the Home page. Fetches its own
 *  products so the page doesn't need to load every category's products upfront, and hides
 *  itself entirely once loaded if the category turns out to have no active products. */
export function CategorySection({ category }) {
  const { data: products = [], isLoading } = useCategoryCarouselProducts(category.id)

  if (!isLoading && products.length === 0) return null

  return (
    <div id={`home-category-section-${category.id}`} className="home-category-section mb-4">
      <h5 className="home-category-title mb-3">
        <span className="home-category-title-bar" aria-hidden="true" />
        {category.name}
      </h5>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <ProductCarousel
          products={products}
          viewMoreTo={ROUTES.STORE.CATEGORY_DETAIL(category.id)}
          idPrefix={`home-category-${category.id}`}
        />
      )}
    </div>
  )
}
