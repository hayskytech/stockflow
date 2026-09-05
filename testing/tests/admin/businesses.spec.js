import { test, expect } from "../../fixtures/auth.fixtures.js"
import { BusinessesPage } from "../../pages/businesses.page.js"

// Platform super-admin area (multitenant_plan.md Phase 7/8) — /#/admin/businesses.
test.describe("Platform — Businesses", () => {
  test("super admin creates a business and sees it listed", async ({ superAdminPage: page }) => {
    const businessesPage = new BusinessesPage(page)
    const stamp = Date.now()
    const name = `E2E Business ${stamp}`
    const slug = `e2e-business-${stamp}`

    await businessesPage.goto()
    await expect(page).toHaveURL(/\/#\/admin\/businesses$/)

    await businessesPage.openCreateModal()
    await businessesPage.fillForm({ name, slug })
    await businessesPage.submit()

    await businessesPage.searchFor(slug)
    await expect(businessesPage.rowByText(name)).toBeVisible()
  })
})
