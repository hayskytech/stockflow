import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"

export function WarehousePage() {
  return (
    <PageWrapper>
      <PageHeader title="Warehouse" description="Warehouse name, address, and contact details" />
      <div className="card">
        <div className="card-body">
          <p className="text-muted mb-0">Warehouse settings form goes here.</p>
        </div>
      </div>
    </PageWrapper>
  )
}
