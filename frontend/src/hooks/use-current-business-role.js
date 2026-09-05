import { useParams } from "react-router-dom"
import { useMe } from "@/features/auth/hooks/use-me"

/**
 * The caller's role IN THE CURRENT BUSINESS (`"admin" | "staff" | undefined`), plus
 * `isAdmin` / `isStaff` convenience flags. A platform super admin counts as `admin`
 * of any business.
 *
 * Use this — NOT the global `useAuthStore().user.role` — to show/hide in-page
 * controls: a user can be admin of one business and staff of another, so the
 * global role is meaningless inside a business. Backend `requireBusinessRole`
 * is the real enforcement; this just keeps the UI honest.
 *
 * Only meaningful inside the `/b/:businessId` tree.
 */
export function useCurrentBusinessRole() {
  const { businessId } = useParams()
  const { data: me, isLoading } = useMe()

  const membershipRole = me?.businesses?.find((b) => b.id === businessId)?.role
  const isSuperAdmin = Boolean(me?.isSuperAdmin)
  const role = isSuperAdmin ? "admin" : membershipRole

  return {
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isSuperAdmin,
    isLoading,
  }
}
