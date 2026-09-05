export class CategoriesPage {
  constructor(page) {
    this.page = page

    this.addCategoryButton = page.getByRole("button", { name: /add category/i })
    this.categoryNameInput = page.locator("#category-name")
    this.categoryActiveCheckbox = page.locator("#category-active")

    this.addSubCategoryButton = page.getByRole("button", { name: /add sub-category/i })
    this.subCategoryNameInput = page.locator("#sub-category-name")
    this.subCategoryCategorySelect = page.locator("#sub-category-category")
    this.subCategoryActiveCheckbox = page.locator("#sub-category-active")

    this.saveButton = page.getByRole("button", { name: /^save$/i })
    this.cancelButton = page.getByRole("button", { name: /^cancel$/i })
    this.serverError = page.locator(".alert-danger")

    this.categoryCard = page.locator(".card.mb-4")
    this.subCategoryCard = page.locator(".card:not(.mb-4)")

    this.deleteCategoryConfirm = page.locator(".modal", { hasText: "Delete category?" }).getByRole("button", { name: /^confirm$/i })
    this.deleteSubCategoryConfirm = page.locator(".modal", { hasText: "Delete sub-category?" }).getByRole("button", { name: /^confirm$/i })
  }

  async goto() {
    await this.page.goto("/#/catalog/categories")
  }

  categoryRowByText(text) {
    return this.categoryCard.locator("table tbody tr", { hasText: text })
  }

  subCategoryRowByText(text) {
    return this.subCategoryCard.locator("table tbody tr", { hasText: text })
  }

  // --- Categories ---

  async openAddCategoryModal() {
    await this.addCategoryButton.click()
    await this.categoryNameInput.waitFor({ state: "visible" })
  }

  async openEditCategoryModal(rowText) {
    await this.categoryRowByText(rowText).getByRole("button", { name: /^edit$/i }).click()
    await this.categoryNameInput.waitFor({ state: "visible" })
  }

  async fillCategoryForm({ name, isActive } = {}) {
    if (name !== undefined) await this.categoryNameInput.fill(name)
    if (isActive !== undefined) {
      const checked = await this.categoryActiveCheckbox.isChecked()
      if (checked !== isActive) await this.categoryActiveCheckbox.click()
    }
  }

  async saveCategory() {
    await this.saveButton.click()
    await this.categoryNameInput.waitFor({ state: "hidden" })
  }

  async deleteCategory(rowText) {
    await this.categoryRowByText(rowText).getByRole("button", { name: /^delete$/i }).click()
    await this.deleteCategoryConfirm.click()
  }

  async selectCategoryForSubCategories(rowText) {
    await this.categoryRowByText(rowText).getByRole("button", { name: /sub-categories/i }).click()
  }

  // --- Sub-categories ---

  async openAddSubCategoryModal() {
    await this.addSubCategoryButton.click()
    await this.subCategoryNameInput.waitFor({ state: "visible" })
  }

  async openEditSubCategoryModal(rowText) {
    await this.subCategoryRowByText(rowText).getByRole("button", { name: /^edit$/i }).click()
    await this.subCategoryNameInput.waitFor({ state: "visible" })
  }

  async fillSubCategoryForm({ categoryIndex, name, isActive } = {}) {
    if (categoryIndex !== undefined) {
      await this.subCategoryCategorySelect.locator("option").nth(categoryIndex + 1).waitFor({ state: "attached" })
      await this.subCategoryCategorySelect.selectOption({ index: categoryIndex + 1 })
    }
    if (name !== undefined) await this.subCategoryNameInput.fill(name)
    if (isActive !== undefined) {
      const checked = await this.subCategoryActiveCheckbox.isChecked()
      if (checked !== isActive) await this.subCategoryActiveCheckbox.click()
    }
  }

  async saveSubCategory() {
    await this.saveButton.click()
    await this.subCategoryNameInput.waitFor({ state: "hidden" })
  }

  async deleteSubCategory(rowText) {
    await this.subCategoryRowByText(rowText).getByRole("button", { name: /^delete$/i }).click()
    await this.deleteSubCategoryConfirm.click()
  }
}
