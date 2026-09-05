import { useState } from "react"
import { Link } from "@/lib/nav"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { useAuthStore } from "@/store/auth.store"
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from "@/features/catalog/hooks/use-categories"
import { CategoryFormModal } from "@/features/catalog/components/CategoryFormModal"
import { ROUTES } from "@/constants/routes"

export function CategoriesPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")

  const [categoryPage, setCategoryPage] = useState(1)

  const [editingCategory, setEditingCategory] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const [categoryServerError, setCategoryServerError] = useState("")

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useCategories({ page: categoryPage, per_page: 100, order: "asc" })
  const categories = categoriesData?.items ?? []

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()

  // Reordering only makes sense when the whole set is on one page.
  const canReorderCategories = isAdmin && (categoriesData?.totalPages ?? 1) <= 1 && categories.length > 1
  const { getDragHandlers: getCategoryDragHandlers } = useSortableList({
    items: categories,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderCategories.mutateAsync(newOrder.map((row) => row.id))
      } catch (err) {
        setCategoryServerError(err.response?.data?.message ?? "Could not reorder categories")
      }
    },
  })

  function openAddCategoryModal() {
    setEditingCategory(null)
    setCategoryServerError("")
    setIsCategoryModalOpen(true)
  }

  function openEditCategoryModal(category) {
    setEditingCategory(category)
    setCategoryServerError("")
    setIsCategoryModalOpen(true)
  }

  async function handleCategorySubmit(value) {
    setCategoryServerError("")
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, input: value })
      } else {
        await createCategory.mutateAsync(value)
      }
      setIsCategoryModalOpen(false)
    } catch (err) {
      setCategoryServerError(err.response?.data?.message ?? "Could not save category")
    }
  }

  async function handleCategoryDelete() {
    try {
      await deleteCategory.mutateAsync(deletingCategory.id)
      setCategoryServerError("")
      setDeletingCategory(null)
    } catch (err) {
      setCategoryServerError(err.response?.data?.message ?? "Could not delete category")
      setDeletingCategory(null)
    }
  }

  const categoryColumns = [
    ...(canReorderCategories ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
    {
      key: "name",
      label: "Name",
      render: (row) => <Link to={ROUTES.CATALOG.CATEGORY_DETAIL(row.id)}>{row.name}</Link>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            label: "",
            className: "text-right",
            render: (row) => (
              <RowActionsMenu
                actions={[
                  { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEditCategoryModal(row) },
                  {
                    key: "delete",
                    label: "Delete",
                    icon: "fa-trash",
                    variant: "danger",
                    onClick: () => setDeletingCategory(row),
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <PageWrapper>
      <PageHeader
        title="Categories"
        count={categoriesData?.total}
        description="Click a category to manage its sub-categories."
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openAddCategoryModal}>
              <i className="fas fa-plus mr-1" />
              Add Category
            </button>
          ) : null
        }
      />

      <div className="card">
        <div className="card-body">
          {isAdmin && categories.length > 1 ? (
            <p className="text-muted small">
              {canReorderCategories ? "Drag rows to reorder." : "Reordering needs the full list on one page."}
            </p>
          ) : null}

          {categoryServerError && !isCategoryModalOpen ? <div className="alert alert-danger">{categoryServerError}</div> : null}

          <DataTable
            columns={categoryColumns}
            rows={categories}
            isLoading={isCategoriesLoading}
            isError={isCategoriesError}
            emptyIcon="fa-tags"
            emptyTitle="No categories yet"
            emptyDescription="Add a category to start organizing products."
            page={categoryPage}
            totalPages={categoriesData?.totalPages ?? 1}
            onPageChange={setCategoryPage}
            getRowProps={canReorderCategories ? (row) => getCategoryDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {isCategoryModalOpen ? (
        <CategoryFormModal
          key={editingCategory?.id ?? "new"}
          open={isCategoryModalOpen}
          category={editingCategory}
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={handleCategorySubmit}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          serverError={categoryServerError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Delete category?"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This cannot be undone.`}
        onConfirm={handleCategoryDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </PageWrapper>
  )
}
