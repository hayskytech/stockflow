/**
 * Platform super-admin — Businesses directory (`/#/admin/businesses`, inside `SuperAdminShell`).
 * No business context, so no `businessId` here.
 *
 * Ids (from BusinessesPage / BusinessFormModal):
 *   #new-business-btn #businesses-search
 *   #business-name #business-slug #business-form-submit
 *   optional first-admin block: #initial-admin-email #initial-admin-name #initial-admin-password
 */
export class BusinessesPage {
  constructor(page) {
    this.page = page
    this.newButton = page.locator("#new-business-btn")
    this.searchInput = page.locator("#businesses-search")

    this.nameInput = page.locator("#business-name")
    this.slugInput = page.locator("#business-slug")
    this.submitButton = page.locator("#business-form-submit")

    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto("/#/admin/businesses")
  }

  async openCreateModal() {
    await this.newButton.click()
    await this.nameInput.waitFor({ state: "visible" })
  }

  async fillForm({ name, slug } = {}) {
    if (name !== undefined) await this.nameInput.fill(name)
    if (slug !== undefined) await this.slugInput.fill(slug)
  }

  async submit() {
    await this.submitButton.click()
    await this.nameInput.waitFor({ state: "hidden" })
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
  }

  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }
}
