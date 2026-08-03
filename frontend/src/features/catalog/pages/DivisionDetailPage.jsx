import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { useAuthStore } from "@/store/auth.store"
import { useDivision, useDivisions } from "@/features/catalog/hooks/use-divisions"
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from "@/features/catalog/hooks/use-categories"
import { CategoryFormModal } from "@/features/catalog/components/CategoryFormModal"
import { LinkCategoryModal } from "@/features/catalog/components/LinkCategoryModal"
import { ROUTES } from "@/constants/routes"

export function DivisionDetailPage() {
  const { id } = useParams()
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")

  const [categoryPage, setCategoryPage] = useState(1)
  const [editingCategory, setEditingCategory] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const [serverError, setServerError] = useState("")

  const { data: division, isLoading: isDivisionLoading, isError: isDivisionError } = useDivision(id)
  const { data: divisionsData } = useDivisions({ page: 1, per_page: 100 })
  const divisions = divisionsData?.items ?? []

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useCategories({ page: categoryPage, per_page: 100, division_id: id, order: "asc" })
  const categories = categoriesData?.items ?? []

  // Every category, so "Link Existing Category" can offer ones that currently live under a
  // different division — this division's own categories are filtered out client-side.
  const { data: allCategoriesData } = useCategories({ page: 1, per_page: 100, order: "asc" })
  const linkableCategories = (allCategoriesData?.items ?? []).filter((category) => category.divisionId !== id)

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()

  const canReorder = isAdmin && (categoriesData?.totalPages ?? 1) <= 1 && categories.length > 1
  const { getDragHandlers } = useSortableList({
    items: categories,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderCategories.mutateAsync({ divisionId: id, orderedIds: newOrder.map((row) => row.id) })
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not reorder categories")
      }
    },
  })

  function openAddModal() {
    setEditingCategory(null)
    setServerError("")
    setIsCategoryModalOpen(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
    setServerError("")
    setIsCategoryModalOpen(true)
  }

  async function handleCategorySubmit(value) {
    setServerError("")
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, input: value })
      } else {
        await createCategory.mutateAsync(value)
      }
      setIsCategoryModalOpen(false)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not save category")
    }
  }

  function linkCategory(categoryId) {
    return updateCategory.mutateAsync({ id: categoryId, input: { divisionId: id } })
  }

  async function handleDelete() {
    try {
      await deleteCategory.mutateAsync(deletingCategory.id)
      setServerError("")
      setDeletingCategory(null)
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Could not delete category")
      setDeletingCategory(null)
    }
  }

  if (isDivisionLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isDivisionError || !division) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Could not load this division.</div>
      </PageWrapper>
    )
  }

  const columns = [
    ...(canReorder ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
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
                  { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEditModal(row) },
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
        title={division.name}
        count={categoriesData?.total}
        description="Categories under this division."
        actions={
          isAdmin ? (
            <>
              <button
                type="button"
                id="division-link-category-btn"
                className="btn btn-secondary mr-2"
                onClick={() => setIsLinkModalOpen(true)}
              >
                <i className="fas fa-link mr-1" />
                Link Existing Categories
              </button>
              <button type="button" id="division-add-category-btn" className="btn btn-primary" onClick={openAddModal}>
                <i className="fas fa-plus mr-1" />
                Add Category
              </button>
            </>
          ) : null
        }
      />

      <div className="card">
        <div className="card-body">
          {serverError && !isCategoryModalOpen && !isLinkModalOpen ? (
            <div className="alert alert-danger">{serverError}</div>
          ) : null}
          {isAdmin && categories.length > 1 ? (
            <p className="text-muted small">
              {canReorder ? "Drag rows to reorder." : "Reordering needs the full list on one page."}
            </p>
          ) : null}
          <DataTable
            columns={columns}
            rows={categories}
            isLoading={isCategoriesLoading}
            isError={isCategoriesError}
            emptyIcon="fa-tags"
            emptyTitle="No categories yet"
            emptyDescription="Add a category or link an existing one to this division."
            page={categoryPage}
            totalPages={categoriesData?.totalPages ?? 1}
            onPageChange={setCategoryPage}
            getRowProps={canReorder ? (row) => getDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {isCategoryModalOpen ? (
        <CategoryFormModal
          key={editingCategory?.id ?? "new"}
          open={isCategoryModalOpen}
          category={editingCategory}
          divisions={divisions}
          defaultDivisionId={id}
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={handleCategorySubmit}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          serverError={serverError}
        />
      ) : null}

      <LinkCategoryModal
        open={isLinkModalOpen}
        categories={linkableCategories}
        onClose={() => setIsLinkModalOpen(false)}
        onLinkOne={linkCategory}
        isSubmitting={updateCategory.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Delete category?"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </PageWrapper>
  )
}
