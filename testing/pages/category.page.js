/**
 * Catalog — Categories & Sub-categories.
 *
 * Multi-tenant + catalog rework (multitenant_plan.md Phase 8):
 *  - lives under `/b/:businessId` — constructor takes `businessId`, `goto()` builds the path
 *  - categories are top-level (no divisions anywhere)
 *  - sub-categories are no longer a second card on the same page: clicking a category name opens
 *    its own detail page (`/#/b/:businessId/catalog/categories/:id`) where sub-categories are managed
 *  - list rows render in the shared `DataTable`; edit/delete are behind the three-dot
 *    `RowActionsMenu` (button `aria-label="Row actions"`, items portaled to `document.body`)
 *  - delete confirmation is the shared `ConfirmDialog` ("Delete category?" / "Delete sub-category?"
 *    with a red "Confirm" button)
 */
export class CategoriesPage {
  constructor(page, businessId) {
    this.page = page
    this.businessId = businessId

    this.addCategoryButton = page.getByRole("button", { name: /add category/i })
    this.categoryNameInput = page.locator("#category-name")
    this.categoryActiveCheckbox = page.locator("#category-active")

    this.addSubCategoryButton = page.getByRole("button", { name: /add sub-category/i })
    this.subCategoryNameInput = page.locator("#sub-category-name")
    this.subCategoryCategorySelect = page.locator("#sub-category-category")
    this.subCategoryActiveCheckbox = page.locator("#sub-category-active")

    // Both modals share a footer "Save" button.
    this.saveButton = page.getByRole("button", { name: /^save$/i })
    this.cancelButton = page.getByRole("button", { name: /^cancel$/i })
    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto(`/#/b/${this.businessId}/catalog/categories`)
  }

  /** A row in whichever table is on screen (categories on the list page, sub-categories on detail). */
  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }

  // Back-compat aliases used by the specs.
  categoryRowByText(text) {
    return this.rowByText(text)
  }

  subCategoryRowByText(text) {
    return this.rowByText(text)
  }

  async _rowAction(rowText, nameRe) {
    await this.rowByText(rowText).getByRole("button", { name: /row actions/i }).click()
    await this.page.getByRole("button", { name: nameRe }).click()
  }

  async _confirm(title) {
    await this.page
      .locator(".modal", { hasText: title })
      .getByRole("button", { name: /^confirm$/i })
      .click()
  }

  // --- Categories ---

  async openAddCategoryModal() {
    await this.addCategoryButton.click()
    await this.categoryNameInput.waitFor({ state: "visible" })
  }

  async openEditCategoryModal(rowText) {
    await this._rowAction(rowText, /^edit$/i)
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
    await this._rowAction(rowText, /^delete$/i)
    await this._confirm("Delete category?")
  }

  /** Opens a category's detail page (where its sub-categories are managed). */
  async openCategory(rowText) {
    await this.rowByText(rowText).getByRole("link").first().click()
    await this.page.waitForURL(/\/catalog\/categories\/[^/]+$/)
  }

  /** Opens the first category in the list — used by the staff read-only check. */
  async openFirstCategory() {
    await this.page.locator("table tbody tr").first().getByRole("link").first().click()
    await this.page.waitForURL(/\/catalog\/categories\/[^/]+$/)
  }

  // --- Sub-categories (on a category's detail page) ---

  async openAddSubCategoryModal() {
    await this.addSubCategoryButton.click()
    await this.subCategoryNameInput.waitFor({ state: "visible" })
  }

  async openEditSubCategoryModal(rowText) {
    await this._rowAction(rowText, /^edit$/i)
    await this.subCategoryNameInput.waitFor({ state: "visible" })
  }

  /** The modal's category `<select>` is pre-filled from the detail page, so only name/active here. */
  async fillSubCategoryForm({ name, isActive } = {}) {
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
    await this._rowAction(rowText, /^delete$/i)
    await this._confirm("Delete sub-category?")
  }
}
