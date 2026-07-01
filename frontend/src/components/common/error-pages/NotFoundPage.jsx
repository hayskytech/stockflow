import { Link } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

export function NotFoundPage() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="display-1 font-weight-bold">404</h1>
      <p className="text-muted">Page not found</p>
      <Link to={ROUTES.DASHBOARD} className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  )
}
