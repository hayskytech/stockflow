import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDivisionOptions, useCategoryOptions } from "@/hooks/use-catalog-options"
import { useHomeStore } from "@/features/home/home.store"
import { ROUTES } from "@/constants/routes"

/** True on devices where hover is the primary input (desktop/mouse) — on these, hover
 *  alone should control the dropdown, since a click-to-toggle on top of hover-to-open
 *  means a click right after the hover-open instantly closes it again. */
function hasHoverSupport() {
  return typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches
}

/** One division's dropdown trigger + its categories as sub-menu items. Fetches its own
 *  categories so the parent menu doesn't need to load every division's categories upfront. */
function StoreNavDivisionItem({ division, isOpen, onOpen, onClose }) {
  const { data: categories = [] } = useCategoryOptions(division.id, true)
  const navigate = useNavigate()

  function goToDivision() {
    navigate(ROUTES.STORE.DIVISION_DETAIL(division.id))
    onClose()
  }

  function goToCategory(category) {
    navigate(ROUTES.STORE.CATEGORY_DETAIL(category.id))
    onClose()
  }

  function handleTriggerClick() {
    if (!hasHoverSupport() && !isOpen) {
      onOpen(division.id)
      return
    }
    goToDivision()
  }

  return (
    <li
      className={`nav-item dropdown ${isOpen ? "show" : ""}`}
      onMouseEnter={() => onOpen(division.id)}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        id={`store-nav-division-${division.id}`}
        className="nav-link btn btn-link"
        onClick={handleTriggerClick}
      >
        {division.name}
        <i className="fas fa-caret-down ml-1" />
      </button>
      <div className={`dropdown-menu ${isOpen ? "show" : ""}`}>
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
 *  categories listed as a dropdown of sub-menu items. Picking "Home" clears the search box;
 *  picking a division/category here navigates straight to its dedicated Division/Category
 *  page instead. */
export function StoreNavMenu() {
  const { data: divisions = [] } = useDivisionOptions(true)
  const [openDivisionId, setOpenDivisionId] = useState(null)
  const setSearch = useHomeStore((s) => s.setSearch)
  const navigate = useNavigate()

  function goHome() {
    setSearch("")
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
