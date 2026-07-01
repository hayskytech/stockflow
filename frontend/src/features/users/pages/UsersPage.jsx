import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"

export function UsersPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Users / Staff"
        description="Manage admin and staff accounts"
        actions={
          <button type="button" className="btn btn-primary">
            <i className="fas fa-plus mr-1" />
            Add User
          </button>
        }
      />
      <div className="card">
        <div className="card-body">
          <EmptyState icon="fa-users" title="No users yet" />
        </div>
      </div>
    </PageWrapper>
  )
}
