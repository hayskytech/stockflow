import { Link } from "react-router-dom"
import { useSiteTitle } from "@/hooks/use-business-settings"
import { useSocialLinksPublic } from "@/hooks/use-social-links-public"
import { ROUTES } from "@/constants/routes"

const SOCIAL_ICONS = [
  { key: "facebookUrl", icon: "fab fa-facebook", label: "Facebook" },
  { key: "instagramUrl", icon: "fab fa-instagram", label: "Instagram" },
  { key: "youtubeUrl", icon: "fab fa-youtube", label: "YouTube" },
  { key: "whatsappUrl", icon: "fab fa-whatsapp", label: "WhatsApp Channel" },
]

/** Storefront footer — brand blurb, account shortcuts, and social links.
 *  Pulls only from public data (site title, social links) so it renders the
 *  same for guests and logged-in customers alike. */
export function Footer() {
  const siteTitle = useSiteTitle()
  const { data: socialLinks } = useSocialLinksPublic()
  const activeSocialLinks = SOCIAL_ICONS.filter(({ key }) => socialLinks?.[key])
  const year = new Date().getFullYear()

  return (
    <footer className="store-footer">
      <div className="zari-rule" aria-hidden="true" />
      <div className="container store-footer-inner">
        <div className="row">
          <div className="col-12 col-md-4 mb-4 mb-md-0">
            <h6>{siteTitle}</h6>
            <p>Sarees, dresses, kidswear and menswear — curated for every occasion.</p>
            {activeSocialLinks.length > 0 ? (
              <ul className="list-inline store-footer-social mb-0">
                {activeSocialLinks.map(({ key, icon, label }) => (
                  <li key={key} className="list-inline-item">
                    <a href={socialLinks[key]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                      <i className={icon} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="col-6 col-md-4 mb-4 mb-md-0">
            <h6>Shop</h6>
            <ul className="list-unstyled mb-0">
              <li>
                <Link to={ROUTES.STORE.HOME}>Home</Link>
              </li>
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
