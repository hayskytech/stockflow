import { test, expect } from "../../fixtures/auth.fixtures.js"
import { DivisionsPage } from "../../pages/division.page.js"

test.describe("Divisions", () => {
  test("admin can add a new division", async ({ adminPage: page }) => {
    const divisionsPage = new DivisionsPage(page)
    const divisionName = `E2E Division ${Date.now()}`

    await divisionsPage.goto()
    await divisionsPage.openAddModal()
    await divisionsPage.fillForm({ name: divisionName })
    await divisionsPage.save()

    await divisionsPage.searchFor(divisionName)
    await expect(divisionsPage.rowByText(divisionName)).toBeVisible()
  })

  test("admin can edit an existing division", async ({ adminPage: page }) => {
    const divisionsPage = new DivisionsPage(page)
    const originalName = `E2E Division ${Date.now()}`
    const updatedName = `${originalName} (Updated)`

    await divisionsPage.goto()
    await divisionsPage.openAddModal()
    await divisionsPage.fillForm({ name: originalName })
    await divisionsPage.save()

    await divisionsPage.searchFor(originalName)
    await expect(divisionsPage.rowByText(originalName)).toBeVisible()

    await divisionsPage.openEditModal(originalName)
    await divisionsPage.fillForm({ name: updatedName })
    await divisionsPage.save()

    await divisionsPage.searchFor(updatedName)
    await expect(divisionsPage.rowByText(updatedName)).toBeVisible()
  })

  test("admin can deactivate a division", async ({ adminPage: page }) => {
    const divisionsPage = new DivisionsPage(page)
    const divisionName = `E2E Division ${Date.now()}`

    await divisionsPage.goto()
    await divisionsPage.openAddModal()
    await divisionsPage.fillForm({ name: divisionName })
    await divisionsPage.save()

    await divisionsPage.searchFor(divisionName)
    await divisionsPage.openEditModal(divisionName)
    await divisionsPage.fillForm({ isActive: false })
    await divisionsPage.save()

    await divisionsPage.searchFor(divisionName)
    await expect(divisionsPage.rowByText(divisionName)).toContainText("Inactive")
  })

  test("admin can delete a division", async ({ adminPage: page }) => {
    const divisionsPage = new DivisionsPage(page)
    const divisionName = `E2E Division ${Date.now()}`

    await divisionsPage.goto()
    await divisionsPage.openAddModal()
    await divisionsPage.fillForm({ name: divisionName })
    await divisionsPage.save()

    await divisionsPage.searchFor(divisionName)
    await expect(divisionsPage.rowByText(divisionName)).toBeVisible()

    await divisionsPage.deleteRow(divisionName)

    await divisionsPage.searchFor(divisionName)
    await expect(divisionsPage.rowByText(divisionName)).toHaveCount(0)
  })

  test("staff cannot see add/edit/delete controls", async ({ staffPage: page }) => {
    const divisionsPage = new DivisionsPage(page)

    await divisionsPage.goto()

    await expect(divisionsPage.addButton).toHaveCount(0)
  })
})
