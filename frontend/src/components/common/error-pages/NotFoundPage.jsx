import { Link } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

// Links to the (global) business picker rather than a dashboard — this can render with no
// business in context (the top-level "*" route).
export function NotFoundPage() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="display-1 font-weight-bold">404</h1>
      <p className="text-muted">Page not found</p>
      <Link to={ROUTES.BUSINESSES} className="btn btn-primary">
        Go to my businesses
      </Link>
    </div>
  )
}
