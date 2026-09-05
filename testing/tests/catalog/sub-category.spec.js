import { test, expect } from "../../fixtures/auth.fixtures.js"
import { CategoriesPage } from "../../pages/category.page.js"

// Sub-categories are managed on a category's own detail page now (no divisions anywhere).
test.describe("Sub-categories", () => {
  test("admin can add a new sub-category", async ({ adminPage: page, businessId }) => {
    const categoriesPage = new CategoriesPage(page, businessId)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.openCategory(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toBeVisible()
  })

  test("admin can edit an existing sub-category", async ({ adminPage: page, businessId }) => {
    const categoriesPage = new CategoriesPage(page, businessId)
    const categoryName = `E2E Category ${Date.now()}`
    const originalName = `E2E Sub-category ${Date.now()}`
    const updatedName = `${originalName} (Updated)`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.openCategory(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ name: originalName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(originalName)).toBeVisible()

    await categoriesPage.openEditSubCategoryModal(originalName)
    await categoriesPage.fillSubCategoryForm({ name: updatedName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(updatedName)).toBeVisible()
  })

  test("admin can deactivate a sub-category", async ({ adminPage: page, businessId }) => {
    const categoriesPage = new CategoriesPage(page, businessId)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.openCategory(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await categoriesPage.openEditSubCategoryModal(subCategoryName)
    await categoriesPage.fillSubCategoryForm({ isActive: false })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toContainText("Inactive")
  })

  test("admin can delete a sub-category", async ({ adminPage: page, businessId }) => {
    const categoriesPage = new CategoriesPage(page, businessId)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.openCategory(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toBeVisible()

    await categoriesPage.deleteSubCategory(subCategoryName)

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toHaveCount(0)
  })

  test("staff cannot see add/edit/delete controls for sub-categories", async ({ staffPage: page, businessId }) => {
    const categoriesPage = new CategoriesPage(page, businessId)

    await categoriesPage.goto()
    await expect(page.locator("table tbody tr").first()).toBeVisible()

    await categoriesPage.openFirstCategory()

    await expect(categoriesPage.addSubCategoryButton).toHaveCount(0)
  })
})
