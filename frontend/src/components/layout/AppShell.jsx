import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapse", sidebarCollapsed)
    return () => document.body.classList.remove("sidebar-collapse")
  }, [sidebarCollapsed])

  return (
    <div className="wrapper">
      <Topbar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
      <Sidebar />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  )
}
