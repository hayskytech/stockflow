import { useRouteError } from "react-router-dom"
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from "@/components/common/error-pages"

export function RouteErrorPage() {
  const error = useRouteError()

  if (error?.status === 403) return <ForbiddenPage />
  if (error?.status >= 500) return <ServerErrorPage />
  return <NotFoundPage />
}
