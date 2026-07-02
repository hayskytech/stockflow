export class ProductsPage {
  constructor(page) {
    this.page = page
    this.addButton = page.getByRole("button", { name: /add product/i })
    this.searchInput = page.getByPlaceholder(/search by name, code, or barcode/i)
    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto("/#/products")
  }

  async openAddPage() {
    await this.addButton.click()
    await this.page.waitForURL(/\/products\/new$/)
  }

  async openEditPage(rowText) {
    await this.rowByText(rowText).getByRole("button", { name: /^edit$/i }).click()
    await this.page.waitForURL(/\/products\/[^/]+\/edit$/)
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
  }

  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }
}
