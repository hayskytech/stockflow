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

    await expect(loginPage.serverError).toHaveText(/invalid credentials/i)
    await expect(page).toHaveURL(/\/login$/)
  })

  /**
   * The OTP tab is deliberately not driven end-to-end here. Every phone number now gets a real
   * code — an unknown number creates the account instead of being silently skipped — so clicking
   * "Send Code" against anything but an MSG91 Demo Credential texts a real handset. What is
   * asserted instead is the part that costs nothing: the step gate itself.
   */
  // storefront on hold (multitenant_plan.md Phase 1)
  test.skip("keeps the OTP code field out of reach until a code has been sent", async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.otpModeTab.click()

    await expect(loginPage.otpInput).toHaveCount(0)
    await expect(loginPage.sendOtpButton).toBeDisabled()

    await loginPage.phoneInput.fill("7000000001")

    await expect(loginPage.sendOtpButton).toBeEnabled()
    await expect(loginPage.otpInput).toHaveCount(0)
  })
})
