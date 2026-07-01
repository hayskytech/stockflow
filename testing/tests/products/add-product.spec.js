import { test, expect } from "../../fixtures/auth.fixtures.js"
import { ProductsPage } from "../../pages/products.page.js"
import { ProductFormPage } from "../../pages/product-form.page.js"

test.describe("Products", () => {
  test("admin can add a new product", async ({ adminPage: page }) => {
    const productsPage = new ProductsPage(page)
    const productFormPage = new ProductFormPage(page)
    const productCode = `E2E-${Date.now()}`
    const productName = `E2E Test Product ${Date.now()}`

    await productsPage.goto()
    await productsPage.openAddPage()
    await productFormPage.fillNewProduct({
      productCode,
      name: productName,
      mrp: 999,
      wsp: 799,
      quantityAvailable: 10,
    })
    await productFormPage.save()

    await productsPage.searchFor(productCode)
    await expect(productsPage.rowByText(productCode)).toBeVisible()
  })

  test("admin can edit an existing product", async ({ adminPage: page }) => {
    const productsPage = new ProductsPage(page)
    const productFormPage = new ProductFormPage(page)
    const productCode = `E2E-${Date.now()}`
    const originalName = `E2E Test Product ${Date.now()}`
    const updatedName = `${originalName} (Updated)`

    await productsPage.goto()
    await productsPage.openAddPage()
    await productFormPage.fillNewProduct({
      productCode,
      name: originalName,
      mrp: 999,
      wsp: 799,
      quantityAvailable: 10,
    })
    await productFormPage.save()

    await productsPage.searchFor(productCode)
    await expect(productsPage.rowByText(productCode)).toBeVisible()

    await productsPage.openEditPage(productCode)
    await productFormPage.updateFields({ name: updatedName, mrp: 1099 })
    await productFormPage.save()

    await productsPage.searchFor(productCode)
    await expect(productsPage.rowByText(updatedName)).toBeVisible()
    await expect(productsPage.rowByText(updatedName)).toContainText("1099.00")
  })
})
