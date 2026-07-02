import { test, expect } from "../../fixtures/auth.fixtures.js"
import { UsersPage } from "../../pages/users.page.js"

test.describe("Users", () => {
  test("admin can create a new user", async ({ adminPage: page }) => {
    const usersPage = new UsersPage(page)
    const email = `e2e-${Date.now()}@example.com`

    await usersPage.goto()
    await usersPage.openAddModal()
    await usersPage.fillForm({
      name: "E2E Test User",
      email,
      role: "staff",
      password: "Passw0rd!123",
    })
    await usersPage.save()

    await usersPage.searchFor(email)
    await expect(usersPage.rowByText(email)).toBeVisible()
  })

  test("admin can edit an existing user", async ({ adminPage: page }) => {
    const usersPage = new UsersPage(page)
    const email = `e2e-${Date.now()}@example.com`
    const updatedName = "E2E Test User (Updated)"

    await usersPage.goto()
    await usersPage.openAddModal()
    await usersPage.fillForm({
      name: "E2E Test User",
      email,
      role: "staff",
      password: "Passw0rd!123",
    })
    await usersPage.save()

    await usersPage.searchFor(email)
    await expect(usersPage.rowByText(email)).toBeVisible()

    await usersPage.openEditModal(email)
    await usersPage.fillForm({ name: updatedName })
    await usersPage.save()

    await usersPage.searchFor(email)
    await expect(usersPage.rowByText(email)).toContainText(updatedName)
  })
})
