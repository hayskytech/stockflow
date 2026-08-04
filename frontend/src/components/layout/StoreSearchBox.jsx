import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useProductSearch } from "@/hooks/use-product-search"
import { resolveMediaUrl } from "@/lib/media"
import { formatMoney } from "@/lib/format"
import { effectivePrice } from "@/lib/pricing"
import { ROUTES } from "@/constants/routes"

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_RESULTS_LIMIT = 8

/**
 * Header type-ahead search: results render in a dropdown under the input, debounced so it
 * doesn't query on every keystroke. Works independently of the current page — it never
 * navigates until a result (or "View all") is actually clicked.
 */
export function StoreSearchBox({ id }) {
  const [value, setValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const trimmedValue = value.trim()
  const debouncedValue = useDebouncedValue(trimmedValue, SEARCH_DEBOUNCE_MS)
  const isPending = trimmedValue !== debouncedValue

  const { data: results = [], isFetching } = useProductSearch(debouncedValue, SEARCH_RESULTS_LIMIT)

  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  function goToProduct(productId) {
    setIsOpen(false)
    setValue("")
    navigate(ROUTES.STORE.PRODUCT_DETAIL(productId))
  }

  const showDropdown = isOpen && trimmedValue.length > 0
  const isSearching = isPending || isFetching

  return (
    <div className="store-search-box position-relative" ref={containerRef}>
      <input
        id={id}
        type="search"
        className="form-control"
        placeholder="Search products…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        autoComplete="off"
      />

      {showDropdown ? (
        <div className="store-search-dropdown">
          {isSearching ? (
            <div className="store-search-dropdown-message">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
            </div>
          ) : results.length === 0 ? (
            <div className="store-search-dropdown-message text-muted">No products found.</div>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                id={`store-search-result-${product.id}`}
                className="store-search-dropdown-item"
                onClick={() => goToProduct(product.id)}
              >
                <span className="store-search-dropdown-thumb">
                  {product.productPhotoUrl ? (
                    <img src={resolveMediaUrl(product.productPhotoUrl)} alt={product.name} />
                  ) : (
                    <i className="fas fa-shirt text-muted" aria-hidden="true" />
                  )}
                </span>
                <span className="store-search-dropdown-info">
                  <span className="store-search-dropdown-name text-truncate">{product.name}</span>
                  <span className="store-search-dropdown-price">
                    {formatMoney(effectivePrice(product.price, product.discountPercent))}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
