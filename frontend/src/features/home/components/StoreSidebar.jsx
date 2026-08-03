import { useDivisionOptions, useCategoryOptions, useSubCategoryOptions } from "@/hooks/use-catalog-options"
import { useHomeStore } from "@/features/home/home.store"

const PRICE_BANDS = [
  { label: "Under ₹500", min: undefined, max: 500 },
  { label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 - ₹2,000", min: 1000, max: 2000 },
  { label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: undefined },
]

/** Ecommerce-style left sidebar for the storefront: division/category tree + price range presets. */
export function StoreSidebar() {
  const divisionFilter = useHomeStore((s) => s.divisionFilter)
  const setDivisionFilter = useHomeStore((s) => s.setDivisionFilter)
  const categoryFilter = useHomeStore((s) => s.categoryFilter)
  const setCategoryFilter = useHomeStore((s) => s.setCategoryFilter)
  const subCategoryFilter = useHomeStore((s) => s.subCategoryFilter)
  const setSubCategoryFilter = useHomeStore((s) => s.setSubCategoryFilter)
  const minPrice = useHomeStore((s) => s.minPrice)
  const maxPrice = useHomeStore((s) => s.maxPrice)
  const setPriceRange = useHomeStore((s) => s.setPriceRange)
  const clearFilters = useHomeStore((s) => s.clearFilters)

  const { data: divisions = [] } = useDivisionOptions(true)
  const { data: categories = [] } = useCategoryOptions(divisionFilter || undefined, true)
  const { data: subCategories = [] } = useSubCategoryOptions(categoryFilter || undefined, true)

  const hasActiveFilters = Boolean(
    divisionFilter || categoryFilter || subCategoryFilter || minPrice !== undefined || maxPrice !== undefined,
  )

  return (
    <aside id="store-sidebar" className="card shadow-sm mb-4">
      <div className="store-sidebar-header d-flex align-items-center justify-content-between">
        <h6 className="font-weight-bold m-0">
          <i className="fas fa-sliders-h mr-2" aria-hidden="true" />
          Filters
        </h6>
        {hasActiveFilters ? (
          <button
            type="button"
            id="store-sidebar-clear-all"
            className="btn btn-link btn-sm p-0"
            onClick={clearFilters}
          >
            Clear all
          </button>
        ) : null}
      </div>
      <div className="card-body">
        <div className="mb-4">
          <h6 className="store-sidebar-section-title category mb-2">
            <i className="fas fa-tags" aria-hidden="true" />
            Category
          </h6>

          <div className="form-group mb-2">
            <label htmlFor="store-filter-division" className="small text-muted mb-1">
              Division
            </label>
            <select
              id="store-filter-division"
              className="form-control form-control-sm"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="">All divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group mb-2">
            <label htmlFor="store-filter-category" className="small text-muted mb-1">
              Category
            </label>
            <select
              id="store-filter-category"
              className="form-control form-control-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={!divisionFilter}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label htmlFor="store-filter-sub-category" className="small text-muted mb-1">
              Sub-category
            </label>
            <select
              id="store-filter-sub-category"
              className="form-control form-control-sm"
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
              disabled={!categoryFilter}
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
                    htmlFor={`store-filter-price-${index}`}
                    className={`form-check store-price-band mb-2${isActive ? " active" : ""}`}
                  >
                    <input
                      type="radio"
                      className="form-check-input"
                      id={`store-filter-price-${index}`}
                      name="store-price-band"
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
              id="store-filter-price-clear"
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
