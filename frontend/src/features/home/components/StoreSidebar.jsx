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

  const { data: divisions = [] } = useDivisionOptions()
  const { data: categories = [] } = useCategoryOptions(divisionFilter || undefined)
  const { data: subCategories = [] } = useSubCategoryOptions(categoryFilter || undefined)

  const hasActiveFilters = Boolean(
    divisionFilter || categoryFilter || subCategoryFilter || minPrice !== undefined || maxPrice !== undefined,
  )

  return (
    <aside id="store-sidebar" className="card shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="font-weight-bold m-0">Filters</h6>
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

        <div className="mb-4">
          <h6 className="text-uppercase text-muted small font-weight-bold mb-2">Category</h6>

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
          <h6 className="text-uppercase text-muted small font-weight-bold mb-2">Price</h6>
          <ul className="list-unstyled mb-0">
            {PRICE_BANDS.map((band, index) => (
              <li key={band.label} className="form-check mb-1">
                <input
                  type="radio"
                  className="form-check-input"
                  id={`store-filter-price-${index}`}
                  name="store-price-band"
                  checked={minPrice === band.min && maxPrice === band.max}
                  onChange={() => setPriceRange(band.min, band.max)}
                />
                <label className="form-check-label" htmlFor={`store-filter-price-${index}`}>
                  {band.label}
                </label>
              </li>
            ))}
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
