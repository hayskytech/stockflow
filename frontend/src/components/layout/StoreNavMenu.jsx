import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDivisionOptions, useCategoryOptions } from "@/hooks/use-catalog-options"
import { useHomeStore } from "@/features/home/home.store"
import { ROUTES } from "@/constants/routes"

/** One division's dropdown trigger + its categories as sub-menu items. Fetches its own
 *  categories so the parent menu doesn't need to load every division's categories upfront. */
function StoreNavDivisionItem({ division, isOpen, onOpen, onClose }) {
  const { data: categories = [] } = useCategoryOptions(division.id)
  const setDivisionFilter = useHomeStore((s) => s.setDivisionFilter)
  const setCategoryFilter = useHomeStore((s) => s.setCategoryFilter)
  const navigate = useNavigate()

  function goToDivision() {
    setDivisionFilter(division.id)
    navigate(ROUTES.STORE.HOME)
    onClose()
  }

  function goToCategory(category) {
    setDivisionFilter(division.id)
    setCategoryFilter(category.id)
    navigate(ROUTES.STORE.HOME)
    onClose()
  }

  return (
    <li className={`nav-item dropdown ${isOpen ? "show" : ""}`}>
      <button
        type="button"
        id={`store-nav-division-${division.id}`}
        className="nav-link btn btn-link"
        onClick={() => (isOpen ? onClose() : onOpen(division.id))}
      >
        {division.name}
      </button>
      <div className={`dropdown-menu ${isOpen ? "show" : ""}`}>
        <button type="button" className="dropdown-item font-weight-bold" onClick={goToDivision}>
          All {division.name}
        </button>
        {categories.length > 0 ? <div className="dropdown-divider" /> : null}
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            id={`store-nav-category-${category.id}`}
            className="dropdown-item"
            onClick={() => goToCategory(category)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </li>
  )
}

/** Secondary storefront nav row: Home + one menu item per division, with that division's
 *  categories listed as a dropdown of sub-menu items. Drives the same home.store filters
 *  used by StoreSidebar, so picking a category here matches picking it in the sidebar. */
export function StoreNavMenu() {
  const { data: divisions = [] } = useDivisionOptions()
  const [openDivisionId, setOpenDivisionId] = useState(null)
  const clearFilters = useHomeStore((s) => s.clearFilters)
  const navigate = useNavigate()

  function goHome() {
    clearFilters()
    navigate(ROUTES.STORE.HOME)
    setOpenDivisionId(null)
  }

  return (
    <nav id="store-nav-menu" className="navbar navbar-expand navbar-light bg-white border-bottom py-0">
      <div className="container">
        <ul className="navbar-nav flex-row flex-wrap">
          <li className="nav-item">
            <button type="button" id="store-nav-home" className="nav-link btn btn-link" onClick={goHome}>
              Home
            </button>
          </li>
          {divisions.map((division) => (
            <StoreNavDivisionItem
              key={division.id}
              division={division}
              isOpen={openDivisionId === division.id}
              onOpen={setOpenDivisionId}
              onClose={() => setOpenDivisionId(null)}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}
