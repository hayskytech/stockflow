import { Link } from "react-router-dom"
import { ROUTES } from "@/constants/routes"

export function ForbiddenPage() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="display-1 font-weight-bold">403</h1>
      <p className="text-muted">You don&apos;t have permission to view this page</p>
      <Link to={ROUTES.BUSINESSES} className="btn btn-primary">
        Go to my businesses
      </Link>
    </div>
  )
}
