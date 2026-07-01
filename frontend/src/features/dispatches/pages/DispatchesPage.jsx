import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"

export function DispatchesPage() {
  return (
    <PageWrapper>
      <PageHeader title="Dispatches" description="Dispatches created against accepted orders" />
      <div className="card">
        <div className="card-body">
          <EmptyState icon="fa-truck" title="No dispatches yet" />
        </div>
      </div>
    </PageWrapper>
  )
}
