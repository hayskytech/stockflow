import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { userDisplayName } from "@/lib/user"

/**
 * Change one member's role. Kept deliberately tiny — a single `<select>` — since the only
 * editable field on a membership is its role. Demoting the last admin is rejected by the
 * backend (409); `serverError` carries that message inline.
 */
export function MemberRoleModal({ open, member, onClose, onSubmit, isSubmitting, serverError }) {
  const [role, setRole] = useState(member?.role ?? "staff")

  return (
    <Modal
      open={open}
      title={`Change role — ${userDisplayName(member)}`}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            id="member-role-submit"
            className="btn btn-primary"
            disabled={isSubmitting || role === member?.role}
            onClick={() => onSubmit(role)}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="form-group mb-0">
        <label htmlFor="member-role-select">Role</label>
        <select
          id="member-role-select"
          className="form-control"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        {serverError ? <div className="invalid-feedback d-block">{serverError}</div> : null}
      </div>
    </Modal>
  )
}
