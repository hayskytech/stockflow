import { test, expect } from "../../fixtures/auth.fixtures.js"
import { CategoriesPage } from "../../pages/category.page.js"

test.describe("Categories", () => {
  test("admin can add a new category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ divisionIndex: 0, name: categoryName })
    await categoriesPage.saveCategory()

    await expect(categoriesPage.categoryRowByText(categoryName)).toBeVisible()
  })

  test("admin can edit an existing category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const originalName = `E2E Category ${Date.now()}`
    const updatedName = `${originalName} (Updated)`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ divisionIndex: 0, name: originalName })
    await categoriesPage.saveCategory()

    await expect(categoriesPage.categoryRowByText(originalName)).toBeVisible()

    await categoriesPage.openEditCategoryModal(originalName)
    await categoriesPage.fillCategoryForm({ name: updatedName })
    await categoriesPage.saveCategory()

    await expect(categoriesPage.categoryRowByText(updatedName)).toBeVisible()
  })

  test("admin can deactivate a category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ divisionIndex: 0, name: categoryName })
    await categoriesPage.saveCategory()

    await categoriesPage.openEditCategoryModal(categoryName)
    await categoriesPage.fillCategoryForm({ isActive: false })
    await categoriesPage.saveCategory()

    await expect(categoriesPage.categoryRowByText(categoryName)).toContainText("Inactive")
  })

  test("admin can delete a category", async ({ adminPage: page }) => {
    const categoriesPage = new CategoriesPage(page)
    const categoryName = `E2E Category ${Date.now()}`

    await categoriesPage.goto()
    await categoriesPage.openAddCategoryModal()
    await categoriesPage.fillCategoryForm({ divisionIndex: 0, name: categoryName })
    await categoriesPage.saveCategory()

    await expect(categoriesPage.categoryRowByText(categoryName)).toBeVisible()

    await categoriesPage.deleteCategory(categoryName)

    await expect(categoriesPage.categoryRowByText(categoryName)).toHaveCount(0)
  })

  test("staff cannot see add/edit/delete controls", async ({ staffPage: page }) => {
    const categoriesPage = new CategoriesPage(page)

    await categoriesPage.goto()

    await expect(categoriesPage.addCategoryButton).toHaveCount(0)
  })
})
