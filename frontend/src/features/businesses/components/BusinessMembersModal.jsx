import { useState } from "react"
import { Link } from "react-router-dom"
import { Modal } from "@/components/ui/Modal"
import { Pagination } from "@/components/common/Pagination"
import { useBusinessMembers } from "@/features/businesses/hooks/use-businesses"
import { userDisplayName } from "@/lib/user"
import { formatDateIST } from "@/lib/format"
import { ROUTES, businessPath } from "@/constants/routes"

const ROLE_BADGES = {
  admin: "badge-danger",
  staff: "badge-info",
}

/**
 * Read-only view of one business's members (super-admin). Member management still happens in
 * the per-business `/b/:id/members` UI — the "Open business" link jumps there.
 */
export function BusinessMembersModal({ open, business, onClose }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useBusinessMembers(
    business?.id,
    { page, per_page: 10 },
    { enabled: open && Boolean(business?.id) },
  )

  const members = data?.items ?? []

  return (
    <Modal
      open={open}
      title={business ? `Members — ${business.name}` : "Members"}
      onClose={onClose}
      footer={
        <>
          {business ? (
            <Link
              id="business-members-open-link"
              to={businessPath(business.id, ROUTES.DASHBOARD)}
              className="btn btn-outline-primary mr-auto"
            >
              Open business
              <i className="fas fa-arrow-right ml-1" />
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {isLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger mb-0">Could not load members.</div>
      ) : members.length === 0 ? (
        <p className="text-muted mb-0">No members yet.</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-2">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Member since</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td>{userDisplayName(m)}</td>
                    <td>{m.email ?? "—"}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGES[m.role] ?? "badge-secondary"}`}>{m.role}</span>
                    </td>
                    <td>{m.memberSince ? formatDateIST(m.memberSince) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </Modal>
  )
}
