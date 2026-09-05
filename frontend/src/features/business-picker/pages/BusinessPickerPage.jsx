import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { logoutApi } from "@/features/auth/auth.api"
import { useMe } from "@/features/auth/hooks/use-me"
import { useAuthStore } from "@/store/auth.store"
import { APP_NAME } from "@/constants/app"
import { ROUTES, businessPath } from "@/constants/routes"

const ROLE_LABELS = { admin: "Admin", staff: "Staff" }

/**
 * Post-login landing when the user has more than one business (or is a super admin). Lists the
 * businesses the user can act in; each card opens that business's dashboard.
 */
export function BusinessPickerPage() {
  const { data: me, isLoading } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const businesses = me?.businesses ?? []

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      queryClient.clear()
      navigate(ROUTES.AUTH.LOGIN, { replace: true })
    }
  }

  return (
    <div className="login-page" style={{ minHeight: "100vh", alignItems: "flex-start", paddingTop: "6vh" }}>
      <div className="w-100" style={{ maxWidth: 640 }}>
        <div className="text-center mb-4">
          <h1 className="h3 mb-1">{APP_NAME}</h1>
          <p className="text-muted mb-0">Choose a business to continue</p>
        </div>

        <div className="card">
          <div className="card-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted">
                  {me?.isSuperAdmin
                    ? "No businesses yet. Create one from the platform admin area."
                    : "You don't have access to any business yet — ask an admin to add you."}
                </p>
              </div>
            ) : (
              <div className="list-group" id="business-picker-list">
                {businesses.map((b) => (
                  <Link
                    key={b.id}
                    id={`business-picker-item-${b.id}`}
                    to={businessPath(b.id, ROUTES.DASHBOARD)}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  >
                    <span>
                      <i className="fas fa-store mr-2 text-muted" />
                      {b.name}
                    </span>
                    <span className="badge badge-secondary text-uppercase">
                      {ROLE_LABELS[b.role] ?? b.role}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-footer d-flex justify-content-between align-items-center">
            {me?.isSuperAdmin ? (
              <Link id="business-picker-admin-link" to={ROUTES.ADMIN.BUSINESSES} className="btn btn-link btn-sm px-0">
                Manage all businesses
              </Link>
            ) : (
              <span />
            )}
            <button id="business-picker-logout" type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
