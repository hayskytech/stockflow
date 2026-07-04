import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

// AdminLTE's `lg` breakpoint — below this the sidebar is an off-canvas overlay
// toggled with `sidebar-open` instead of the desktop `sidebar-collapse` (mini-icon) mode.
const MOBILE_BREAKPOINT_PX = 992

export function AppShell() {
  const [sidebarToggled, setSidebarToggled] = useState(false)

  useEffect(() => {
    const sidebarClass = window.innerWidth < MOBILE_BREAKPOINT_PX ? "sidebar-open" : "sidebar-collapse"
    document.body.classList.toggle(sidebarClass, sidebarToggled)
    return () => document.body.classList.remove(sidebarClass)
  }, [sidebarToggled])

  return (
    <div className="wrapper">
      <Topbar onToggleSidebar={() => setSidebarToggled((v) => !v)} />
      <Sidebar />
      <div id="sidebar-overlay" onClick={() => setSidebarToggled(false)} />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  )
}
