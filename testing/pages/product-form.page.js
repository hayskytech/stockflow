export class ProductFormPage {
  constructor(page) {
    this.page = page
    this.productCodeInput = page.locator("#product-code")
    this.nameInput = page.locator("#product-name")
    this.divisionSelect = page.locator("#product-division")
    this.categorySelect = page.locator("#product-category")
    this.mrpInput = page.locator("#product-mrp")
    this.wspInput = page.locator("#product-wsp")
    this.stockInput = page.locator("#product-stock")
    this.unitInput = page.locator("#product-unit")
    this.saveButton = page.getByRole("button", { name: /^save$/i })
    this.serverError = page.locator(".alert-danger")
  }

  async fillNewProduct({ productCode, name, mrp, wsp, quantityAvailable, unit = "pc" }) {
    await this.productCodeInput.fill(productCode)
    await this.nameInput.fill(name)

    await this.divisionSelect.locator("option").nth(1).waitFor({ state: "attached" })
    await this.divisionSelect.selectOption({ index: 1 })

    await this.categorySelect.locator("option").nth(1).waitFor({ state: "attached" })
    await this.categorySelect.selectOption({ index: 1 })

    await this.mrpInput.fill(String(mrp))
    await this.wspInput.fill(String(wsp))
    await this.stockInput.fill(String(quantityAvailable))
    await this.unitInput.fill(unit)
  }

  async updateFields({ name, mrp, wsp, quantityAvailable, unit }) {
    if (name !== undefined) await this.nameInput.fill(name)
    if (mrp !== undefined) await this.mrpInput.fill(String(mrp))
    if (wsp !== undefined) await this.wspInput.fill(String(wsp))
    if (quantityAvailable !== undefined) await this.stockInput.fill(String(quantityAvailable))
    if (unit !== undefined) await this.unitInput.fill(unit)
  }

  async save() {
    await this.saveButton.click()
    await this.page.waitForURL(/\/products$/)
  }
}
