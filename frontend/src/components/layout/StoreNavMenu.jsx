import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDivisionOptions, useCategoryOptions } from "@/hooks/use-catalog-options"
import { ROUTES } from "@/constants/routes"

/** One division's dropdown trigger + its categories as sub-menu items. Fetches its own
 *  categories so the parent menu doesn't need to load every division's categories upfront.
 *  The dropdown opens only on click (see StoreNavMenu for the click-outside-to-close logic). */
function StoreNavDivisionItem({ division, isOpen, onOpen, onClose }) {
  const { data: categories = [] } = useCategoryOptions(division.id, true)
  const navigate = useNavigate()

  function goToCategory(category) {
    navigate(ROUTES.STORE.CATEGORY_DETAIL(category.id))
    onClose()
  }

  function handleTriggerClick() {
    if (isOpen) {
      onClose()
    } else {
      onOpen(division.id)
    }
  }

  return (
    <li className={`nav-item dropdown ${isOpen ? "show" : ""}`}>
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
        <button
          type="button"
          id={`store-nav-division-view-all-${division.id}`}
          className="dropdown-item"
          onClick={() => {
            navigate(ROUTES.STORE.DIVISION_DETAIL(division.id))
            onClose()
          }}
        >
          View all {division.name}
        </button>
        <div className="dropdown-divider" />
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
 *  categories listed as a dropdown of sub-menu items. Picking a division/category here
 *  navigates straight to its dedicated Division/Category page instead. */
export function StoreNavMenu() {
  const { data: divisions = [] } = useDivisionOptions(true)
  const [openDivisionId, setOpenDivisionId] = useState(null)
  const navRef = useRef(null)
  const navigate = useNavigate()

  function goHome() {
    navigate(ROUTES.STORE.HOME)
    setOpenDivisionId(null)
  }

  // Clicking anywhere outside the menu closes whichever division dropdown is open
  // (mirrors Bootstrap's own behavior, and StoreTopbar's account menu).
  useEffect(() => {
    if (openDivisionId === null) return undefined
    function handleOutsideClick(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDivisionId(null)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [openDivisionId])

  return (
    <nav id="store-nav-menu" className="navbar navbar-expand navbar-light bg-white border-bottom py-0">
      <div className={`container ${openDivisionId !== null ? "store-nav-menu-open" : ""}`} ref={navRef}>
        <ul className="navbar-nav flex-row">
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
