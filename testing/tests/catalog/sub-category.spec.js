import { test, expect } from "../../fixtures/auth.fixtures.js"
import { CategoriesPage } from "../../pages/category.page.js"

test.describe("Sub-categories", () => {
  test("admin can add a new sub-category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.selectCategoryForSubCategories(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ categoryIndex: 0, name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toBeVisible()
  })

  test("admin can edit an existing sub-category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`
    const originalName = `E2E Sub-category ${Date.now()}`
    const updatedName = `${originalName} (Updated)`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.selectCategoryForSubCategories(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ categoryIndex: 0, name: originalName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(originalName)).toBeVisible()

    await categoriesPage.openEditSubCategoryModal(originalName)
    await categoriesPage.fillSubCategoryForm({ name: updatedName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(updatedName)).toBeVisible()
  })

  test("admin can deactivate a sub-category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.selectCategoryForSubCategories(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ categoryIndex: 0, name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await categoriesPage.openEditSubCategoryModal(subCategoryName)
    await categoriesPage.fillSubCategoryForm({ isActive: false })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toContainText("Inactive")
  })

  test("admin can delete a sub-category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`
    const subCategoryName = `E2E Sub-category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.selectCategoryForSubCategories(categoryName)
    await categoriesPage.openAddSubCategoryModal()
    await categoriesPage.fillSubCategoryForm({ categoryIndex: 0, name: subCategoryName })
    await categoriesPage.saveSubCategory()

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toBeVisible()

    await categoriesPage.deleteSubCategory(subCategoryName)

    await expect(categoriesPage.subCategoryRowByText(subCategoryName)).toHaveCount(0)
  })

  test("staff cannot see add/edit/delete controls for sub-categories", async ({ staffPage: page }) => {
    const categoriesPage = new CategoriesPage(page)

    await categoriesPage.goto()
    await expect(categoriesPage.categoryCard.locator("table tbody tr").first()).toBeVisible()

    await categoriesPage.categoryCard.locator("table tbody tr").first().getByRole("button", { name: /sub-categories/i }).click()

    await expect(categoriesPage.addSubCategoryButton).toHaveCount(0)
  })
})
