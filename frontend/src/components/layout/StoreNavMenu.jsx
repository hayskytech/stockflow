import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

// TODO(phase-1): storefront disabled. This menu previously listed one dropdown per
// division; divisions have been removed from the catalog. Rendered as a bare "Home"
// link for now — the whole storefront is being unmounted in Phase 1.
export function StoreNavMenu() {
  const navigate = useNavigate()

  return (
    <nav id="store-nav-menu" className="navbar navbar-expand navbar-light bg-white border-bottom py-0">
      <div className="container">
        <ul className="navbar-nav flex-row">
          <li className="nav-item">
            <button
              type="button"
              id="store-nav-home"
              className="nav-link btn btn-link"
              onClick={() => navigate(ROUTES.STORE.HOME)}
            >
              Home
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}
