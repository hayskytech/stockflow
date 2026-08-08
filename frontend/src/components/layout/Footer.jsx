import { Link } from "react-router-dom"
import { useDivisionOptions } from "@/hooks/use-catalog-options"
import { useSiteTitle } from "@/hooks/use-warehouse-details"
import { ROUTES } from "@/constants/routes"

/** Storefront footer — brand blurb, division quick-links, and account shortcuts. Pulls only
 *  from public data (site title, active divisions) so it renders the same for guests and
 *  logged-in customers alike. */
export function Footer() {
  const siteTitle = useSiteTitle()
  const { data: divisions = [] } = useDivisionOptions(true)
  const year = new Date().getFullYear()

  return (
    <footer className="store-footer">
      <div className="zari-rule" aria-hidden="true" />
      <div className="container store-footer-inner">
        <div className="row">
          <div className="col-12 col-md-4 mb-4 mb-md-0">
            <h6>{siteTitle}</h6>
            <p>Sarees, dresses, kidswear and menswear — curated for every occasion.</p>
          </div>
          <div className="col-6 col-md-4 mb-4 mb-md-0">
            <h6>Shop</h6>
            <ul className="list-unstyled mb-0">
              <li>
                <Link to={ROUTES.STORE.HOME}>Home</Link>
              </li>
              {divisions.map((division) => (
                <li key={division.id}>
                  <Link to={ROUTES.STORE.DIVISION_DETAIL(division.id)}>{division.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-6 col-md-4">
            <h6>Account</h6>
            <ul className="list-unstyled mb-0">
              <li>
                <Link to={ROUTES.STORE.CART}>Cart</Link>
              </li>
              <li>
                <Link to={ROUTES.STORE.ORDERS}>My Orders</Link>
              </li>
              <li>
                <Link to={ROUTES.AUTH.LOGIN}>Login</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="store-footer-bottom">
        © {year} {siteTitle}. All rights reserved.
      </div>
    </footer>
  )
}
