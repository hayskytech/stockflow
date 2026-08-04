import { useSubCategoryOptions } from "@/hooks/use-catalog-options"
import { useCategoryDetailStore } from "@/features/category-detail/category-detail.store"

const PRICE_BANDS = [
  { label: "Under ₹500", min: undefined, max: 500 },
  { label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 - ₹2,000", min: 1000, max: 2000 },
  { label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: undefined },
]

/** Horizontal filter bar for the Category page: sub-category picker (within this category) +
 *  price range presets, laid out as a single row above the product grid instead of a sidebar
 *  so the product grid can use the full page width. */
export function CategoryFilterBar({ categoryId }) {
  const subCategoryFilter = useCategoryDetailStore((s) => s.subCategoryFilter)
  const setSubCategoryFilter = useCategoryDetailStore((s) => s.setSubCategoryFilter)
  const minPrice = useCategoryDetailStore((s) => s.minPrice)
  const maxPrice = useCategoryDetailStore((s) => s.maxPrice)
  const setPriceRange = useCategoryDetailStore((s) => s.setPriceRange)
  const clearFilters = useCategoryDetailStore((s) => s.clearFilters)

  const { data: subCategories = [] } = useSubCategoryOptions(categoryId, true)

  const hasActiveFilters = Boolean(subCategoryFilter || minPrice !== undefined || maxPrice !== undefined)

  return (
    <div id="category-filter-bar" className="card shadow-sm mb-4">
      <div className="card-body category-filter-bar-body">
        {subCategories.length > 0 ? (
          <div className="category-filter-group">
            <span className="store-sidebar-section-title category">
              <i className="fas fa-tags" aria-hidden="true" />
              Sub-category
            </span>
            <select
              id="category-filter-sub-category"
              className="form-control form-control-sm category-filter-select"
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
            >
              <option value="">All sub-categories</option>
              {subCategories.map((subCategory) => (
                <option key={subCategory.id} value={subCategory.id}>
                  {subCategory.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="category-filter-group">
          <span className="store-sidebar-section-title price">
            <i className="fas fa-rupee-sign" aria-hidden="true" />
            Price
          </span>
          {PRICE_BANDS.map((band, index) => {
            const isActive = minPrice === band.min && maxPrice === band.max
            return (
              <button
                key={band.label}
                type="button"
                id={`category-filter-price-${index}`}
                className={`store-price-band-pill${isActive ? " active" : ""}`}
                onClick={() => setPriceRange(band.min, band.max)}
              >
                {band.label}
              </button>
            )
          })}
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            id="category-filter-clear-all"
            className="btn btn-link btn-sm category-filter-clear"
            onClick={clearFilters}
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  )
}
