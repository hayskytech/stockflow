import { ProductCard } from "@/features/home/components/ProductCard"

/** A category heading followed by a responsive grid of product cards. */
export function CategorySection({ categoryName, products }) {
  return (
    <section className="mb-5">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0 font-weight-bold">{categoryName}</h4>
        <span className="text-muted small">{products.length} item{products.length === 1 ? "" : "s"}</span>
      </div>
      <div className="row">
        {products.map((product) => (
          <div key={product.id} className="col-6 col-md-4 col-lg-3 mb-4">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
