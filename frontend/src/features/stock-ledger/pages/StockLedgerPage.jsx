import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"

export function StockLedgerPage() {
  return (
    <PageWrapper>
      <PageHeader title="Stock Ledger" description="Stock movement history — in, out, and adjustments" />
      <div className="card">
        <div className="card-body">
          <EmptyState icon="fa-book" title="No stock movements yet" />
        </div>
      </div>
    </PageWrapper>
  )
}
