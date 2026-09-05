import { useMatches } from "react-router-dom"
import { Link } from "@/lib/nav"

/**
 * Reads `handle.crumb` off the deepest matched route (see app/router.jsx) and renders the
 * full trail it returns. Hidden on the dashboard itself since a single-item trail is a no-op.
 */
export function Breadcrumbs() {
  const matches = useMatches()
  const current = [...matches].reverse().find((m) => typeof m.handle?.crumb === "function")
  const trail = current ? current.handle.crumb(current.params) : []

  if (trail.length <= 1) return null

  return (
    <ol className="breadcrumb bg-transparent p-0 mb-3">
      {trail.map((crumb, index) => {
        const isLast = index === trail.length - 1
        return (
          <li key={crumb.label} className={`breadcrumb-item ${isLast ? "active" : ""}`} aria-current={isLast ? "page" : undefined}>
            {!isLast && crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
          </li>
        )
      })}
    </ol>
  )
}
