import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { useCategoryOptions } from "@/hooks/use-catalog-options"
import { CategorySection } from "@/features/home/components/CategorySection"
import { ROUTES } from "@/constants/routes"

/** Cycled through by division index so each section reads as its own "shelf" via a subtle
 *  accent color — drawn from the storefront palette, not tied to any division data. */
const DIVISION_ACCENTS = ["var(--sc-maroon)", "var(--sc-gold)", "var(--sc-teal)", "var(--sc-maroon-light)"]

/** Cap on how many of a division's categories get their own carousel row on the Home page —
 *  keeps the page from growing unbounded for divisions with many categories. The rest are
 *  reachable via the "View all" link through to the full Division page. */
const CATEGORIES_PER_DIVISION = 4

/** One division's section on the Home page: a colorful banner heading, then one carousel
 *  row per active category in that division. Fetches its own categories so the page doesn't
 *  need to load every division's categories upfront. */
export function DivisionSection({ division, index }) {
  const { data: categories = [] } = useCategoryOptions(division.id, true)
  const accent = DIVISION_ACCENTS[index % DIVISION_ACCENTS.length]
  const visibleCategories = categories.slice(0, CATEGORIES_PER_DIVISION)
  const hiddenCount = categories.length - visibleCategories.length
  const prefersReducedMotion = useReducedMotion()

  if (categories.length === 0) return null

  return (
    <motion.section
      id={`home-division-section-${division.id}`}
      className="home-division-section mb-5"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="home-division-header" style={{ "--division-accent": accent }}>
        <h3 className="home-division-title mb-0">{division.name}</h3>
        <Link
          id={`home-division-view-all-${division.id}`}
          to={ROUTES.STORE.DIVISION_DETAIL(division.id)}
          className="home-division-view-all"
        >
          {hiddenCount > 0 ? `View all (+${hiddenCount} more)` : "View all"}
          <i className="fas fa-arrow-right ml-2" aria-hidden="true" />
        </Link>
      </div>
      <div className="zari-rule zari-rule--sm home-division-rule" aria-hidden="true" />

      <div className="home-division-body">
        {visibleCategories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>
    </motion.section>
  )
}
