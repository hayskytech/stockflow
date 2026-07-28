import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/** Resets the scrollable content area to the top on every sidebar/route navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.querySelector(".content-wrapper")?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
