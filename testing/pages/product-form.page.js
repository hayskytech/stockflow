/**
 * Add / Edit Product form (`/#/b/:businessId/products/new` and `.../products/:id/edit`).
 *
 * Multi-tenant + pricing rework (multitenant_plan.md Phase 8):
 *  - reached under `/b/:businessId` — pass `businessId` so `gotoNew()` builds the right path
 *  - pricing is `price` + `discount_percent` (the old `mrp` / `wsp` / `unit` / `stock` fields are gone)
 *  - there is no division field
 *  - a "new" product may optionally include a first stock batch (the initial-stock block)
 *
 * Real field ids (see frontend ProductFormPage.jsx):
 *   #product-code #product-name #product-description #product-category #product-sub-category
 *   #product-color #product-size #product-price #product-discount-percent #product-reorder-level
 *   #product-pieces-per-set #product-active
 *   initial stock: #product-add-stock #product-initial-stock-quantity
 *                  #product-initial-stock-invoice-no #product-initial-stock-invoice-date
 *                  #product-initial-stock-note
 */
export class ProductFormPage {
  constructor(page, businessId) {
    this.page = page
    this.businessId = businessId

    this.productCodeInput = page.locator("#product-code")
    this.nameInput = page.locator("#product-name")
    this.descriptionInput = page.locator("#product-description")
    this.categorySelect = page.locator("#product-category")
    this.subCategorySelect = page.locator("#product-sub-category")
    this.colorInput = page.locator("#product-color")
    this.sizeSelect = page.locator("#product-size")
    this.priceInput = page.locator("#product-price")
    this.discountPercentInput = page.locator("#product-discount-percent")
    this.reorderLevelInput = page.locator("#product-reorder-level")
    this.piecesPerSetInput = page.locator("#product-pieces-per-set")
    this.activeCheckbox = page.locator("#product-active")

    this.addStockCheckbox = page.locator("#product-add-stock")
    this.initialStockQuantityInput = page.locator("#product-initial-stock-quantity")
    this.initialStockInvoiceNoInput = page.locator("#product-initial-stock-invoice-no")
    this.initialStockInvoiceDateInput = page.locator("#product-initial-stock-invoice-date")
    this.initialStockNoteInput = page.locator("#product-initial-stock-note")

    this.saveButton = page.getByRole("button", { name: /^save$/i })
    this.serverError = page.locator(".alert-danger")
  }

  async gotoNew() {
    await this.page.goto(`/#/b/${this.businessId}/products/new`)
    await this.productCodeInput.waitFor({ state: "visible" })
  }

  /**
   * Fills the create form. `price` / `discountPercent` replace the old `mrp` / `wsp`.
   * Pass an `initialStock` object to also add a first stock batch.
   */
  async fillNewProduct({ productCode, name, price, discountPercent = 0, initialStock } = {}) {
    await this.productCodeInput.fill(productCode)
    await this.nameInput.fill(name)

    await this.categorySelect.locator("option").nth(1).waitFor({ state: "attached" })
    await this.categorySelect.selectOption({ index: 1 })

    if (price !== undefined) await this.priceInput.fill(String(price))
    await this.discountPercentInput.fill(String(discountPercent))

    if (initialStock) {
      await this.addStockCheckbox.check()
      if (initialStock.quantity !== undefined) {
        await this.initialStockQuantityInput.fill(String(initialStock.quantity))
      }
      if (initialStock.invoiceNo !== undefined) {
        await this.initialStockInvoiceNoInput.fill(initialStock.invoiceNo)
      }
      if (initialStock.invoiceDate !== undefined) {
        await this.initialStockInvoiceDateInput.fill(initialStock.invoiceDate)
      }
      if (initialStock.note !== undefined) {
        await this.initialStockNoteInput.fill(initialStock.note)
      }
    }
  }

  async updateFields({ name, price, discountPercent, reorderLevel } = {}) {
    if (name !== undefined) await this.nameInput.fill(name)
    if (price !== undefined) await this.priceInput.fill(String(price))
    if (discountPercent !== undefined) await this.discountPercentInput.fill(String(discountPercent))
    if (reorderLevel !== undefined) await this.reorderLevelInput.fill(String(reorderLevel))
  }

  async save() {
    await this.saveButton.click()
    await this.page.waitForURL(/\/products$/)
  }
}
