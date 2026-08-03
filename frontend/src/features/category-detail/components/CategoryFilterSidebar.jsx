import { useSubCategoryOptions } from "@/hooks/use-catalog-options"
import { useCategoryDetailStore } from "@/features/category-detail/category-detail.store"

const PRICE_BANDS = [
  { label: "Under ₹500", min: undefined, max: 500 },
  { label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 - ₹2,000", min: 1000, max: 2000 },
  { label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: undefined },
]

/** Left sidebar for the Category page: sub-category picker (within this category) + price
 *  range presets. Mirrors the ecommerce sidebar look previously shown on the Home page, now
 *  scoped to browsing one category instead of the whole catalog. */
export function CategoryFilterSidebar({ categoryId }) {
  const subCategoryFilter = useCategoryDetailStore((s) => s.subCategoryFilter)
  const setSubCategoryFilter = useCategoryDetailStore((s) => s.setSubCategoryFilter)
  const minPrice = useCategoryDetailStore((s) => s.minPrice)
  const maxPrice = useCategoryDetailStore((s) => s.maxPrice)
  const setPriceRange = useCategoryDetailStore((s) => s.setPriceRange)
  const clearFilters = useCategoryDetailStore((s) => s.clearFilters)

  const { data: subCategories = [] } = useSubCategoryOptions(categoryId, true)

  const hasActiveFilters = Boolean(subCategoryFilter || minPrice !== undefined || maxPrice !== undefined)

  return (
    <aside id="category-filter-sidebar" className="card shadow-sm mb-4">
      <div className="store-sidebar-header d-flex align-items-center justify-content-between">
        <h6 className="font-weight-bold m-0">
          <i className="fas fa-sliders-h mr-2" aria-hidden="true" />
          Filters
        </h6>
        {hasActiveFilters ? (
          <button
            type="button"
            id="category-filter-clear-all"
            className="btn btn-link btn-sm p-0"
            onClick={clearFilters}
          >
            Clear all
          </button>
        ) : null}
      </div>
      <div className="card-body">
        {subCategories.length > 0 ? (
          <div className="mb-4">
            <h6 className="store-sidebar-section-title category mb-2">
              <i className="fas fa-tags" aria-hidden="true" />
              Sub-category
            </h6>

            <div className="form-group mb-0">
              <select
                id="category-filter-sub-category"
                className="form-control form-control-sm"
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
          </div>
        ) : null}

        <div>
          <h6 className="store-sidebar-section-title price mb-2">
            <i className="fas fa-rupee-sign" aria-hidden="true" />
            Price
          </h6>
          <ul className="list-unstyled mb-0">
            {PRICE_BANDS.map((band, index) => {
              const isActive = minPrice === band.min && maxPrice === band.max
              return (
                <li key={band.label}>
                  <label
                    htmlFor={`category-filter-price-${index}`}
                    className={`form-check store-price-band mb-2${isActive ? " active" : ""}`}
                  >
                    <input
                      type="radio"
                      className="form-check-input"
                      id={`category-filter-price-${index}`}
                      name="category-filter-price-band"
                      checked={isActive}
                      onChange={() => setPriceRange(band.min, band.max)}
                    />
                    <span className="form-check-label">{band.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          {minPrice !== undefined || maxPrice !== undefined ? (
            <button
              type="button"
              id="category-filter-price-clear"
              className="btn btn-link btn-sm p-0 mt-1"
              onClick={() => setPriceRange(undefined, undefined)}
            >
              Clear price filter
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
