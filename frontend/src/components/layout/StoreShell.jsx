import { Outlet } from "react-router-dom"
import { StoreTopbar } from "@/components/layout/StoreTopbar"

/** Storefront layout for customers — top navbar only, no admin sidebar. */
export function StoreShell() {
  return (
    <div className="storefront min-vh-100 bg-light">
      <StoreTopbar />
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  )
}
