import { Link } from "react-router-dom"
import { Modal } from "@/components/ui/Modal"
import { ROUTES } from "@/constants/routes"

/** Shown when a guest tries to add a product to cart — cart/checkout are account-owned. */
export function LoginRequiredModal({ open, onClose }) {
  return (
    <Modal open={open} title="Sign in to continue" onClose={onClose}>
      <p className="mb-3">Please log in or create an account to add items to your cart.</p>
      <div className="d-flex" style={{ gap: "0.5rem" }}>
        <Link id="login-required-login-link" to={ROUTES.AUTH.LOGIN} className="btn btn-primary flex-fill">
          Log In
        </Link>
        <Link id="login-required-register-link" to={ROUTES.AUTH.REGISTER} className="btn btn-outline-primary flex-fill">
          Create Account
        </Link>
      </div>
    </Modal>
  )
}
