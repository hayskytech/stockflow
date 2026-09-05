import { useState } from "react"
import { useParams } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { useCurrentBusinessRole } from "@/hooks/use-current-business-role"
import { useCategories, useCategory } from "@/features/catalog/hooks/use-categories"
import {
  useCreateSubCategory,
  useDeleteSubCategory,
  useReorderSubCategories,
  useSubCategories,
  useUpdateSubCategory,
} from "@/features/catalog/hooks/use-sub-categories"
import { SubCategoryFormModal } from "@/features/catalog/components/SubCategoryFormModal"

export function CategoryDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useCurrentBusinessRole()

  const [subCategoryPage, setSubCategoryPage] = useState(1)
  const [editingSubCategory, setEditingSubCategory] = useState(null)
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false)
  const [deletingSubCategory, setDeletingSubCategory] = useState(null)
  const [subCategoryServerError, setSubCategoryServerError] = useState("")

  const { data: category, isLoading: isCategoryLoading, isError: isCategoryError } = useCategory(id)

  // All categories, so a sub-category can be moved to a sibling category.
  const { data: categoriesData } = useCategories({ page: 1, per_page: 100, order: "asc" })
  const categories = categoriesData?.items ?? []

  const {
    data: subCategoriesData,
    isLoading: isSubCategoriesLoading,
    isError: isSubCategoriesError,
  } = useSubCategories({ page: subCategoryPage, per_page: 100, category_id: id, order: "asc" })
  const subCategories = subCategoriesData?.items ?? []

  const createSubCategory = useCreateSubCategory()
  const updateSubCategory = useUpdateSubCategory()
  const deleteSubCategory = useDeleteSubCategory()
  const reorderSubCategories = useReorderSubCategories()

  const canReorderSubCategories = isAdmin && (subCategoriesData?.totalPages ?? 1) <= 1 && subCategories.length > 1
  const { getDragHandlers: getSubCategoryDragHandlers } = useSortableList({
    items: subCategories,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderSubCategories.mutateAsync({ categoryId: id, orderedIds: newOrder.map((row) => row.id) })
      } catch (err) {
        setSubCategoryServerError(err.response?.data?.message ?? "Could not reorder sub-categories")
      }
    },
  })

  function openAddSubCategoryModal() {
    setEditingSubCategory(null)
    setSubCategoryServerError("")
    setIsSubCategoryModalOpen(true)
  }

  function openEditSubCategoryModal(subCategory) {
    setEditingSubCategory(subCategory)
    setSubCategoryServerError("")
    setIsSubCategoryModalOpen(true)
  }

  async function handleSubCategorySubmit(value) {
    setSubCategoryServerError("")
    try {
      if (editingSubCategory) {
        await updateSubCategory.mutateAsync({ id: editingSubCategory.id, input: value })
      } else {
        await createSubCategory.mutateAsync(value)
      }
      setIsSubCategoryModalOpen(false)
    } catch (err) {
      setSubCategoryServerError(err.response?.data?.message ?? "Could not save sub-category")
    }
  }

  async function handleSubCategoryDelete() {
    try {
      await deleteSubCategory.mutateAsync(deletingSubCategory.id)
      setSubCategoryServerError("")
      setDeletingSubCategory(null)
    } catch (err) {
      setSubCategoryServerError(err.response?.data?.message ?? "Could not delete sub-category")
      setDeletingSubCategory(null)
    }
  }

  if (isCategoryLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isCategoryError || !category) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Could not load this category.</div>
      </PageWrapper>
    )
  }

  const subCategoryColumns = [
    ...(canReorderSubCategories ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
    { key: "name", label: "Name" },
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
                  { key: "edit", label: "Edit", icon: "fa-pen", onClick: () => openEditSubCategoryModal(row) },
                  {
                    key: "delete",
                    label: "Delete",
                    icon: "fa-trash",
                    variant: "danger",
                    onClick: () => setDeletingSubCategory(row),
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
        title={category.name}
        count={subCategoriesData?.total}
        description={`Sub-categories under "${category.name}".`}
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openAddSubCategoryModal}>
              <i className="fas fa-plus mr-1" />
              Add Sub-category
            </button>
          ) : null
        }
      />

      <div className="card">
        <div className="card-body">
          {subCategoryServerError && !isSubCategoryModalOpen ? (
            <div className="alert alert-danger">{subCategoryServerError}</div>
          ) : null}
          {isAdmin && subCategories.length > 1 ? (
            <p className="text-muted small">
              {canReorderSubCategories ? "Drag rows to reorder." : "Reordering needs the full list on one page."}
            </p>
          ) : null}
          <DataTable
            columns={subCategoryColumns}
            rows={subCategories}
            isLoading={isSubCategoriesLoading}
            isError={isSubCategoriesError}
            emptyIcon="fa-tag"
            emptyTitle="No sub-categories yet"
            emptyDescription="Add a sub-category to further organize this category."
            page={subCategoryPage}
            totalPages={subCategoriesData?.totalPages ?? 1}
            onPageChange={setSubCategoryPage}
            getRowProps={canReorderSubCategories ? (row) => getSubCategoryDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {isSubCategoryModalOpen ? (
        <SubCategoryFormModal
          key={editingSubCategory?.id ?? "new"}
          open={isSubCategoryModalOpen}
          subCategory={editingSubCategory}
          defaultCategoryId={id}
          categories={categories}
          onClose={() => setIsSubCategoryModalOpen(false)}
          onSubmit={handleSubCategorySubmit}
          isSubmitting={createSubCategory.isPending || updateSubCategory.isPending}
          serverError={subCategoryServerError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingSubCategory)}
        title="Delete sub-category?"
        message={`Are you sure you want to delete "${deletingSubCategory?.name}"? This cannot be undone.`}
        onConfirm={handleSubCategoryDelete}
        onCancel={() => setDeletingSubCategory(null)}
      />
    </PageWrapper>
  )
}
