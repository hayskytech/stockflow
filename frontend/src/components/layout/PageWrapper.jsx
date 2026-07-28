import { Breadcrumbs } from "@/components/common/Breadcrumbs"

export function PageWrapper({ children }) {
  return (
    <div className="content">
      <div className="container-fluid">
        <Breadcrumbs />
        {children}
      </div>
    </div>
  )
}
