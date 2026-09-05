/**
 * Products list (`/#/b/:businessId/products`).
 *
 * Multi-tenant (multitenant_plan.md Phase 8): constructor takes `businessId`; `goto()` builds the
 * `/#/b/<businessId>/products` path. Row-level actions (Edit) now live behind the shared
 * three-dot `RowActionsMenu` (button `aria-label="Row actions"`, menu items portaled to
 * `document.body`).
 */
export class ProductsPage {
  constructor(page, businessId) {
    this.page = page
    this.businessId = businessId
    this.addButton = page.getByRole("button", { name: /add product/i })
    this.searchInput = page.getByPlaceholder(/search by name or code/i)
    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto(`/#/b/${this.businessId}/products`)
  }

  async openAddPage() {
    await this.addButton.click()
    await this.page.waitForURL(/\/products\/new$/)
  }

  async openEditPage(rowText) {
    await this.rowByText(rowText).getByRole("button", { name: /row actions/i }).click()
    await this.page.getByRole("button", { name: /^edit$/i }).click()
    await this.page.waitForURL(/\/products\/[^/]+\/edit$/)
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
  }

  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }
}
