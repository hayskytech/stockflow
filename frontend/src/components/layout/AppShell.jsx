import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { ScrollToTop } from "@/components/common/ScrollToTop"

// AdminLTE's `lg` breakpoint. Below it the sidebar must be off-canvas by default —
// the CSS only auto-hides it under 768px; in the 768–992 range stock AdminLTE relies
// on its JS adding `sidebar-collapse` to <body>, which we replicate here since the
// AdminLTE JS bundle isn't loaded. Opening below `lg` adds `sidebar-open`, which also
// shows the dimmed #sidebar-overlay (its CSS applies up to 991.98px).
const DESKTOP_MIN_PX = 992
const DESKTOP_QUERY = `(min-width: ${DESKTOP_MIN_PX}px)`

export function AppShell() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    function handleChange(event) {
      setIsDesktop(event.matches)
      setSidebarOpen(event.matches) // desktop: sidebar visible; smaller: start off-canvas
    }
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapse", !sidebarOpen)
    document.body.classList.toggle("sidebar-open", sidebarOpen && !isDesktop)
    return () => document.body.classList.remove("sidebar-collapse", "sidebar-open")
  }, [sidebarOpen, isDesktop])

  return (
    <div className="wrapper">
      <ScrollToTop />
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar />
      <div id="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  )
}
