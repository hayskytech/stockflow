import { test, expect } from "../../fixtures/auth.fixtures.js"
import { MembersPage } from "../../pages/members.page.js"

// Replaces the old tests/users/users.spec.js — the in-shell /users page is gone; member
// management is now per-business at /#/b/:businessId/members (multitenant_plan.md Phase 8).
test.describe("Members", () => {
  test("business admin adds a new staff member and sees them in the list", async ({
    adminPage: page,
    businessId,
  }) => {
    const membersPage = new MembersPage(page, businessId)
    const email = `e2e-member-${Date.now()}@example.com`

    await membersPage.goto()
    await membersPage.openAddModal()
    await membersPage.fillForm({
      email,
      role: "staff",
      name: "E2E Member",
      // A brand-new email needs a policy-compliant password (backend enforces it).
      password: "NewPassword@123",
    })
    await membersPage.submit()

    await membersPage.searchFor(email)
    await expect(membersPage.rowByText(email)).toBeVisible()
  })

  test("business admin promotes a member to admin", async ({ adminPage: page, businessId }) => {
    const membersPage = new MembersPage(page, businessId)
    const email = `e2e-member-${Date.now()}@example.com`

    await membersPage.goto()
    await membersPage.openAddModal()
    await membersPage.fillForm({
      email,
      role: "staff",
      name: "E2E Member",
      password: "NewPassword@123",
    })
    await membersPage.submit()

    await membersPage.searchFor(email)
    await expect(membersPage.rowByText(email)).toBeVisible()

    await membersPage.changeRole(email, "admin")

    await membersPage.searchFor(email)
    await expect(membersPage.rowByText(email)).toContainText(/admin/i)
  })
})
