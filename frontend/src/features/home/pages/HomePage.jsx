import { EmptyState } from "@/components/common/EmptyState"
import { useCategoryOptions } from "@/hooks/use-catalog-options"
import { useNoticePublic } from "@/hooks/use-notice-public"
import { HeroSlider } from "@/features/home/components/HeroSlider"
import { CategorySection } from "@/features/home/components/CategorySection"

export function HomePage() {
  const { data: categories = [], isLoading, isError } = useCategoryOptions(true)
  const { data: notice } = useNoticePublic()

  return (
    <div>
      <HeroSlider />

      {notice?.message ? (
        <div id="store-notice-bar" className="store-notice-bar mb-4">
          <div className="store-notice-bar-track">
            <span>{notice.message}</span>
            <span aria-hidden="true">{notice.message}</span>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : isError ? (
        <div className="alert alert-danger">Could not load the catalog. Please try again.</div>
      ) : categories.length === 0 ? (
        <EmptyState icon="fa-shirt" title="No products yet" description="Check back soon for new arrivals." />
      ) : (
        categories.map((category) => <CategorySection key={category.id} category={category} />)
      )}
    </div>
  )
}
