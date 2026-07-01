import { useRouteError } from "react-router-dom"
import { NotFoundPage } from "@/components/common/error-pages"

export function RouteErrorPage() {
  const error = useRouteError()

  if (error?.status === 404) return <NotFoundPage />

  return <NotFoundPage />
}
