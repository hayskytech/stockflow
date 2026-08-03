import { Link, useParams } from "react-router-dom"
import { useCategoryOptions } from "@/hooks/use-catalog-options"
import { useDivisionDetail } from "@/features/division-detail/hooks/use-division-detail"
import { CategorySection } from "@/features/division-detail/components/CategorySection"
import { EmptyState } from "@/components/common/EmptyState"
import { ROUTES } from "@/constants/routes"

export function DivisionPage() {
  const { id } = useParams()
  const { data: division, isLoading: isLoadingDivision, isError: isDivisionError } = useDivisionDetail(id)
  const { data: categories = [], isLoading: isLoadingCategories } = useCategoryOptions(id, true)

  if (isLoadingDivision || isLoadingCategories) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  if (isDivisionError || !division) {
    return <div className="alert alert-danger">Could not load this division. It may no longer be available.</div>
  }

  return (
    <div id={`division-page-${division.id}`}>
      <Link to={ROUTES.STORE.HOME} className="text-muted small mb-3 d-inline-block">
        <i className="fas fa-arrow-left mr-1" /> Back to shopping
      </Link>

      <h2 className="mb-4">{division.name}</h2>

      {categories.length === 0 ? (
        <EmptyState icon="fa-shirt" title="No categories yet" description="Check back soon for new arrivals." />
      ) : (
        categories.map((category) => <CategorySection key={category.id} category={category} />)
      )}
    </div>
  )
}
