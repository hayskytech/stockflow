import { test, expect } from "@playwright/test"
import { LoginPage } from "../../pages/login.page.js"

test.describe("Login", () => {
  test("signs in with valid admin credentials and reaches the dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD)

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("signs in with valid staff credentials and reaches the dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    console.log(process.env.TEST_STAFF_EMAIL, process.env.TEST_STAFF_PASSWORD)

    await loginPage.login(process.env.TEST_STAFF_EMAIL, process.env.TEST_STAFF_PASSWORD)

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("shows a generic error for an incorrect password", async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.login(process.env.TEST_ADMIN_EMAIL, "definitely-the-wrong-password")

    await expect(loginPage.serverError).toHaveText(/invalid email or password/i)
    await expect(page).toHaveURL(/\/login$/)
  })
})
