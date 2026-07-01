import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"

export function ReportsPage() {
  return (
    <PageWrapper>
      <PageHeader title="Reports" description="Stock summary and order history reports" />
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Stock Summary</h3>
            </div>
            <div className="card-body text-muted">Report content goes here.</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Order History</h3>
            </div>
            <div className="card-body text-muted">Report content goes here.</div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
