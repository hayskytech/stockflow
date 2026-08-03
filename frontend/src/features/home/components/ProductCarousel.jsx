import { useRef } from "react"
import { Link } from "react-router-dom"
import { ProductCard } from "@/components/common/ProductCard"

const SCROLL_AMOUNT = 640

/** Horizontally scrollable row of product cards, with a "View More" tile pinned as the
 *  last item and optional prev/next arrow buttons on wider screens. */
export function ProductCarousel({ products, viewMoreTo, idPrefix }) {
  const trackRef = useRef(null)

  function scrollByAmount(amount) {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="product-carousel">
      <button
        type="button"
        id={`${idPrefix}-prev`}
        className="product-carousel-arrow product-carousel-arrow-left d-none d-md-flex"
        aria-label="Scroll left"
        onClick={() => scrollByAmount(-SCROLL_AMOUNT)}
      >
        <i className="fas fa-chevron-left" aria-hidden="true" />
      </button>

      <div className="product-carousel-track" ref={trackRef}>
        {products.map((product) => (
          <div key={product.id} className="product-carousel-item">
            <ProductCard product={product} />
          </div>
        ))}

        <div className="product-carousel-item">
          <Link id={`${idPrefix}-view-more`} to={viewMoreTo} className="product-carousel-viewmore h-100">
            <i className="fas fa-arrow-right" aria-hidden="true" />
            <span>View More</span>
          </Link>
        </div>
      </div>

      <button
        type="button"
        id={`${idPrefix}-next`}
        className="product-carousel-arrow product-carousel-arrow-right d-none d-md-flex"
        aria-label="Scroll right"
        onClick={() => scrollByAmount(SCROLL_AMOUNT)}
      >
        <i className="fas fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  )
}
