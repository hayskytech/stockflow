import { useState } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable } from "@/components/common/DataTable"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { RowActionsMenu } from "@/components/ui/RowActionsMenu"
import { DragHandle, useSortableList } from "@/components/common/SortableList"
import { useAuthStore } from "@/store/auth.store"
import { useCatalogStore } from "@/features/catalog/catalog.store"
import { useDivisions } from "@/features/catalog/hooks/use-divisions"
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from "@/features/catalog/hooks/use-categories"
import {
  useCreateSubCategory,
  useDeleteSubCategory,
  useReorderSubCategories,
  useSubCategories,
  useUpdateSubCategory,
} from "@/features/catalog/hooks/use-sub-categories"
import { CategoryFormModal } from "@/features/catalog/components/CategoryFormModal"
import { SubCategoryFormModal } from "@/features/catalog/components/SubCategoryFormModal"

export function CategoriesPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin")
  const categoryDivisionFilter = useCatalogStore((s) => s.categoryDivisionFilter)
  const setCategoryDivisionFilter = useCatalogStore((s) => s.setCategoryDivisionFilter)
  const selectedCategoryId = useCatalogStore((s) => s.selectedCategoryId)
  const setSelectedCategoryId = useCatalogStore((s) => s.setSelectedCategoryId)

  const [categoryPage, setCategoryPage] = useState(1)
  const [subCategoryPage, setSubCategoryPage] = useState(1)

  const [editingCategory, setEditingCategory] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const [categoryServerError, setCategoryServerError] = useState("")

  const [editingSubCategory, setEditingSubCategory] = useState(null)
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false)
  const [deletingSubCategory, setDeletingSubCategory] = useState(null)
  const [subCategoryServerError, setSubCategoryServerError] = useState("")

  const { data: divisionsData } = useDivisions({ page: 1, per_page: 100 })
  const divisions = divisionsData?.items ?? []

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useCategories({ page: categoryPage, per_page: 100, division_id: categoryDivisionFilter || undefined, order: "asc" })
  const categories = categoriesData?.items ?? []

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()

  // Reordering is scoped to one division, so it only makes sense once a specific
  // division is selected (not the "All divisions" view) and the whole set is on one page.
  const canReorderCategories =
    isAdmin && Boolean(categoryDivisionFilter) && (categoriesData?.totalPages ?? 1) <= 1 && categories.length > 1
  const { getDragHandlers: getCategoryDragHandlers } = useSortableList({
    items: categories,
    getId: (row) => row.id,
    onReorder: async (newOrder) => {
      try {
        await reorderCategories.mutateAsync({ divisionId: categoryDivisionFilter, orderedIds: newOrder.map((row) => row.id) })
      } catch (err) {
        setCategoryServerError(err.response?.data?.message ?? "Could not reorder categories")
      }
    },
  })

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null
  const {
    data: subCategoriesData,
    isLoading: isSubCategoriesLoading,
    isError: isSubCategoriesError,
  } = useSubCategories({ page: subCategoryPage, per_page: 100, category_id: selectedCategoryId, order: "asc" })
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
        await reorderSubCategories.mutateAsync({ categoryId: selectedCategoryId, orderedIds: newOrder.map((row) => row.id) })
      } catch (err) {
        setSubCategoryServerError(err.response?.data?.message ?? "Could not reorder sub-categories")
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
      if (selectedCategoryId === deletingCategory.id) setSelectedCategoryId("")
      setDeletingCategory(null)
    } catch (err) {
      setCategoryServerError(err.response?.data?.message ?? "Could not delete category")
      setDeletingCategory(null)
    }
  }

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
      setDeletingSubCategory(null)
    } catch (err) {
      setSubCategoryServerError(err.response?.data?.message ?? "Could not delete sub-category")
      setDeletingSubCategory(null)
    }
  }

  const categoryColumns = [
    ...(canReorderCategories ? [{ key: "drag", label: "", render: () => <DragHandle /> }] : []),
    { key: "name", label: "Name" },
    { key: "divisionName", label: "Division" },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-success" : "badge-secondary"}`}>{row.isActive ? "Active" : "Inactive"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <>
          <button
            type="button"
            className={`btn btn-sm mr-2 ${selectedCategoryId === row.id ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => {
              setSelectedCategoryId(row.id)
              setSubCategoryPage(1)
            }}
          >
            Sub-categories
          </button>
          {isAdmin ? (
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
          ) : null}
        </>
      ),
    },
  ]

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
        title="Categories"
        count={categoriesData?.total}
        description="Categories sit under a division; sub-categories sit under a category."
        actions={
          isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openAddCategoryModal}>
              <i className="fas fa-plus mr-1" />
              Add Category
            </button>
          ) : null
        }
      />

      <div className="card mb-4">
        <div className="card-body">
          <div className="form-group mb-3" style={{ maxWidth: 320 }}>
            <label htmlFor="category-division-filter">Filter by division</label>
            <select
              id="category-division-filter"
              className="form-control"
              value={categoryDivisionFilter}
              onChange={(e) => {
                setCategoryDivisionFilter(e.target.value)
                setCategoryPage(1)
                setSelectedCategoryId("")
              }}
            >
              <option value="">All divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <small className="form-text text-muted">
                {canReorderCategories
                  ? "Drag rows to reorder."
                  : "Select a single division to drag rows and reorder its categories."}
              </small>
            ) : null}
          </div>

          {categoryServerError && !isCategoryModalOpen ? <div className="alert alert-danger">{categoryServerError}</div> : null}

          <DataTable
            columns={categoryColumns}
            rows={categories}
            isLoading={isCategoriesLoading}
            isError={isCategoriesError}
            emptyIcon="fa-tags"
            emptyTitle="No categories yet"
            emptyDescription="Add a category under a division to start organizing products."
            page={categoryPage}
            totalPages={categoriesData?.totalPages ?? 1}
            onPageChange={setCategoryPage}
            getRowProps={canReorderCategories ? (row) => getCategoryDragHandlers(row.id) : undefined}
          />
        </div>
      </div>

      {selectedCategory ? (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">
              Sub-categories of &quot;{selectedCategory?.name}&quot;
              {typeof subCategoriesData?.total === "number" ? ` (${subCategoriesData.total})` : ""}
            </h3>
            {isAdmin ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={openAddSubCategoryModal}>
                <i className="fas fa-plus mr-1" />
                Add Sub-category
              </button>
            ) : null}
          </div>
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
      ) : null}

      {isCategoryModalOpen ? (
        <CategoryFormModal
          key={editingCategory?.id ?? "new"}
          open={isCategoryModalOpen}
          category={editingCategory}
          divisions={divisions}
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={handleCategorySubmit}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          serverError={categoryServerError}
        />
      ) : null}

      {isSubCategoryModalOpen ? (
        <SubCategoryFormModal
          key={editingSubCategory?.id ?? "new"}
          open={isSubCategoryModalOpen}
          subCategory={editingSubCategory}
          categories={categories}
          onClose={() => setIsSubCategoryModalOpen(false)}
          onSubmit={handleSubCategorySubmit}
          isSubmitting={createSubCategory.isPending || updateSubCategory.isPending}
          serverError={subCategoryServerError}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Delete category?"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This cannot be undone.`}
        onConfirm={handleCategoryDelete}
        onCancel={() => setDeletingCategory(null)}
      />

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
